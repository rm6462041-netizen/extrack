import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import api from '../../../utils/common/serve';
import { useAuth } from '../../../context/AuthContext';
import { parseTradeNumber } from '../../../utils/common/fieldValidation';
import { DropdownSelect as CustomSelect } from "@/components/Common/base/dropdown/dropdown";
import { Button } from "@/components/Common/base/buttons/button";
import TradeSaveOverlay from '../TradeSaveOverlay/TradeSaveOverlay';

const normalizeHeader = (value) => (
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^[\uFEFF\uFFFE]+/, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
);

const parseExcelSerialDate = (val) => {
  const num = Number(val);
  if (!Number.isNaN(num) && num > 25000 && num < 60000) {
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    if (!Number.isNaN(date.getTime())) {
      const pad = (n) => String(n).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }
  }
  return String(val || '').trim();
};

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || '');
  const pad = (part) => String(part).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

function FileUploadForm({ csvData, setCsvData, brokers = [], selectedBrokerId, setSelectedBrokerId, brokerConnectionId }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [previewData, setPreviewData] = useState([]);
  const [activeBrokerMapping, setActiveBrokerMapping] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingTrades, setIsUploadingTrades] = useState(false);
  const [failedLogoPath, setFailedLogoPath] = useState(null);
  const fileInputRef = useRef(null);
  const selectedBroker = brokers.find((broker) => broker.id === selectedBrokerId);

  useEffect(() => {
    if (!brokerConnectionId) {
      setActiveBrokerMapping(null);
      return;
    }
    api.get(`/broker-connections/${brokerConnectionId}/mapping?tradeMethod=csv_upload`)
      .then((res) => {
        if (res.data?.success && res.data?.mapping) {
          setActiveBrokerMapping(res.data.mapping);
        } else {
          setActiveBrokerMapping(null);
        }
      })
      .catch(() => setActiveBrokerMapping(null));
  }, [brokerConnectionId]);
  const accountOptions = brokers.map((broker) => ({
    value: broker.id,
    label: `${broker.accountName || broker.name} - ${broker.name}`,
  }));
  const brokerInitials = String(selectedBroker?.name || 'Account').slice(0, 2).toUpperCase();
  const hasBrokerLogo = Boolean(selectedBroker?.logoPath && failedLogoPath !== selectedBroker.logoPath);

  const handleUploadedFile = (file) => {
    if (!brokerConnectionId) {
      alert('Choose a trading account before adding a file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File size too large. Please upload a file smaller than 5MB.');
      return;
    }

    const reader = new FileReader();
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isHtml = file.name.endsWith('.html') || file.name.endsWith('.htm') || file.type.includes('html');
    const isJson = file.name.endsWith('.json') || file.type.includes('json');

    reader.onload = (e) => {
      try {
        const fileContent = e.target.result;
        if (isExcel) {
          parseXLSXData(fileContent);
        } else if (isHtml) {
          parseHTMLData(fileContent);
        } else if (isJson) {
          parseJSONData(fileContent);
        } else {
          parseCSVData(fileContent);
        }
      } catch (error) {
        alert('File could not be read or parsed. Please check the format and try again.');
      }
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else if (isHtml || isJson || file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      reader.readAsText(file);
    } else {
      alert('Please upload a valid file format (CSV, Excel .xlsx/.xls, JSON, or HTML statement).');
    }
  };

  const processAndValidateRows = (rows) => {
    const dbFieldMapping = activeBrokerMapping?.fieldMapping || {};
    const dbRequiredHeaders = activeBrokerMapping?.requiredHeaders || [];

    if (dbRequiredHeaders.includes('__broker_csv_mapping_not_configured__')) {
      alert(`⚠️ CSV Upload is not supported for ${selectedBroker?.name || 'this account'}. Please select a supported account or use Manual Entry.`);
      return null;
    }

    const validRequiredHeaders = dbRequiredHeaders.filter((h) => h && !h.startsWith('__'));
    const expectedAliasesSet = new Set(validRequiredHeaders.map(normalizeHeader));

    Object.values(dbFieldMapping).forEach((sourceField) => {
      const aliases = Array.isArray(sourceField) ? sourceField : [sourceField];
      aliases.forEach((alias) => {
        if (alias) expectedAliasesSet.add(normalizeHeader(alias));
      });
    });

    const expectedHeaders = Array.from(expectedAliasesSet);

    let bestRowIndex = -1;
    let highestScore = 0;
    let maxDistinctMatches = 0;

    rows.forEach((row, idx) => {
      if (!Array.isArray(row)) return;
      const normalizedCells = row.map(normalizeHeader);
      if (normalizedCells.filter(Boolean).length === 0) return;

      let score = 0;
      let distinctMatches = 0;
      expectedHeaders.forEach((expected) => {
        if (normalizedCells.includes(expected)) {
          score += 2;
          distinctMatches += 1;
        }
      });

      if (distinctMatches >= 2 && (score > highestScore || (score === highestScore && distinctMatches > maxDistinctMatches))) {
        highestScore = score;
        maxDistinctMatches = distinctMatches;
        bestRowIndex = idx;
      }
    });

    if (bestRowIndex === -1) {
      alert(`⚠️ File Header Validation Failed!\n\nCould not locate a valid trade header row for ${selectedBroker?.name || 'the selected broker'}.\n\nPlease ensure you selected the correct broker account and uploaded a valid statement.`);
      return null;
    }

    const rawHeaderRow = rows[bestRowIndex] || [];
    const normalizedHeaders = rawHeaderRow.map(normalizeHeader);

    const missingHeaders = [];

    if (validRequiredHeaders.length > 0) {
      const hasRequiredMatch = validRequiredHeaders.some((reqH) => normalizedHeaders.includes(normalizeHeader(reqH)));
      if (!hasRequiredMatch) {
        missingHeaders.push(validRequiredHeaders.join(' or '));
      }
    }

    if (Object.keys(dbFieldMapping).length > 0) {
      const essentialFields = ['symbol', 'quantity'];
      for (const field of essentialFields) {
        const sourceField = dbFieldMapping[field];
        if (sourceField) {
          const aliases = Array.isArray(sourceField) ? sourceField : [sourceField];
          const hasMatch = aliases.some((alias) => normalizedHeaders.includes(normalizeHeader(alias)));
          if (!hasMatch && !missingHeaders.some((m) => m.includes(field))) {
            missingHeaders.push(`${field} (${aliases.join(' or ')})`);
          }
        }
      }
    }

    if (missingHeaders.length > 0) {
      alert(`⚠️ File Header Validation Failed!\n\nThe uploaded file is missing required header(s) for ${selectedBroker?.name || 'the selected broker'}:\n• ${missingHeaders.join('\n• ')}\n\nPlease ensure you selected the correct broker account and uploaded a valid statement.`);
      return null;
    }

    const columnToCanonicalMap = {};

    normalizedHeaders.forEach((normHeader, colIdx) => {
      if (!normHeader) return;
      let matchedCanonical = null;

      for (const [canonicalField, sourceField] of Object.entries(dbFieldMapping)) {
        const aliases = Array.isArray(sourceField) ? sourceField : [sourceField];
        const isMatch = aliases.some((alias) => normalizeHeader(alias) === normHeader);
        if (isMatch) {
          matchedCanonical = canonicalField;
          break;
        }
      }

      columnToCanonicalMap[colIdx] = matchedCanonical || normHeader;
    });

    const headerMap = {};
    rawHeaderRow.forEach((rawCell, colIdx) => {
      const normH = normalizedHeaders[colIdx];
      if (normH) {
        headerMap[normH] = columnToCanonicalMap[colIdx];
      }
    });

    const records = [];

    for (let i = bestRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row) || !row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== '')) {
        continue;
      }
      const record = {};
      row.forEach((val, colIdx) => {
        const fieldKey = columnToCanonicalMap[colIdx];
        if (fieldKey && val !== undefined && val !== null && String(val).trim() !== '') {
          let formattedVal = val instanceof Date ? val.toISOString() : parseExcelSerialDate(val);
          if (!record[fieldKey]) {
            record[fieldKey] = formattedVal;
          }
        }
      });

      if (record.entry_date || record.entry_time) {
        const datePart = record.entry_date || record.entry_timestamp || '';
        const timePart = record.entry_time || '';
        if (datePart && timePart) {
          record.entry_timestamp = `${datePart} ${timePart}`.trim();
        } else if (datePart && !record.entry_timestamp) {
          record.entry_timestamp = datePart;
        }
      }

      if (record.exit_date || record.exit_time) {
        const datePart = record.exit_date || record.exit_timestamp || '';
        const timePart = record.exit_time || '';
        if (datePart && timePart) {
          record.exit_timestamp = `${datePart} ${timePart}`.trim();
        } else if (datePart && !record.exit_timestamp) {
          record.exit_timestamp = datePart;
        }
      }

      const rawSide = String(record.side || record.buy___sell || record.buy_sell || '').trim().toLowerCase();
      if (['b', 'buy', 'long'].includes(rawSide)) record.side = 'Buy';
      else if (['s', 'sell', 'short'].includes(rawSide)) record.side = 'Sell';

      if (record.side === 'sell' && !record.entry_price && record.exit_price) {
        record.entry_price = record.exit_price;
      } else if (record.side === 'buy' && !record.exit_price && record.entry_price) {
        record.exit_price = record.entry_price;
      }

      if (Object.keys(record).length > 0 && (record.symbol || record.quantity)) {
        records.push(record);
      }
    }

    if (!records.length) {
      alert('No valid trade records found in the uploaded file after header parsing.');
      return null;
    }

    return { headers: normalizedHeaders, headerMap, records };
  };

  const parseXLSXData = (arrayBuffer) => {
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      alert('Excel workbook contains no sheets.');
      return;
    }
    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    if (!rows.length) {
      alert('No trade records found in Excel sheet.');
      return;
    }

    const processed = processAndValidateRows(rows);
    if (!processed) return;

    setPreviewData(processed.records.slice(0, 5));
    setCsvData({
      headers: processed.headers,
      headerMap: processed.headerMap,
      records: processed.records,
      format: 'xlsx'
    });
  };

  const detectCSVDelimiter = (text) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '').slice(0, 20);
    if (!lines.length) return ',';
    const delimiters = [',', ';', '\t', '|'];
    const counts = { ',': 0, ';': 0, '\t': 0, '|': 0 };
    lines.forEach((line) => {
      delimiters.forEach((d) => {
        let count = 0;
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          if (line[i] === '"') inQuotes = !inQuotes;
          else if (line[i] === d && !inQuotes) count++;
        }
        counts[d] += count;
      });
    });
    let bestDelimiter = ',';
    let maxCount = -1;
    delimiters.forEach((d) => {
      if (counts[d] > maxCount) {
        maxCount = counts[d];
        bestDelimiter = d;
      }
    });
    return bestDelimiter;
  };

  const parseCSVRow = (line, delimiter = ',') => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const parseCSVData = (csvText) => {
    const lines = csvText.split(/\r?\n/).filter((line) => line.trim() !== '');
    if (lines.length < 2) {
      alert('File is empty or has no data rows.');
      return;
    }

    const delimiter = detectCSVDelimiter(csvText);
    const rows = lines.map((line) => parseCSVRow(line, delimiter));
    const processed = processAndValidateRows(rows);
    if (!processed) return;

    setPreviewData(processed.records.slice(0, 5));
    setCsvData({
      headers: processed.headers,
      headerMap: processed.headerMap,
      records: processed.records,
      format: 'csv'
    });
  };

  const parseJSONData = (jsonText) => {
    const parsed = JSON.parse(jsonText);
    const rawRecords = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.trades) ? parsed.trades : [];
    if (!rawRecords.length) {
      alert('No trade records found in JSON.');
      return;
    }

    const sampleKeys = Object.keys(rawRecords[0]);
    const rows = [sampleKeys, ...rawRecords.map((rec) => sampleKeys.map((k) => rec[k]))];
    const processed = processAndValidateRows(rows);
    if (!processed) return;

    setPreviewData(processed.records.slice(0, 5));
    setCsvData({
      headers: processed.headers,
      headerMap: processed.headerMap,
      records: processed.records,
      format: 'json'
    });
  };

  const parseHTMLData = (htmlText) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    const trElements = Array.from(doc.querySelectorAll('table tr'));
    if (trElements.length < 2) {
      alert('No statement tables or trade rows found in HTML.');
      return;
    }

    const rows = trElements.map((tr) => Array.from(tr.querySelectorAll('td, th')).map((cell) => cell.textContent.trim()));
    const processed = processAndValidateRows(rows);
    if (!processed) return;

    setPreviewData(processed.records.slice(0, 5));
    setCsvData({
      headers: processed.headers,
      headerMap: processed.headerMap,
      records: processed.records,
      format: 'html'
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const removeFile = () => {
    setCsvData(null);
    setPreviewData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const changeAccount = (event) => {
    const nextBroker = brokers.find((broker) => String(broker.id) === event.target.value);
    if (nextBroker?.id === selectedBrokerId) return;
    removeFile();
    setSelectedBrokerId(nextBroker?.id ?? null);
  };

  const submitUploadedTrades = async () => {
    if (isUploadingTrades) return;
    if (!csvData) {
      alert('No trade data to upload.');
      return;
    }
    if (!brokerConnectionId) {
      alert('Choose a trading account before uploading.');
      return;
    }
    if (!user?.ID) {
      alert('Please login first!');
      navigate('/login');
      return;
    }

    setIsUploadingTrades(true);

    try {
      const trades = csvData.records || [];

      if (!trades.length) {
        throw new Error('No valid trades found in file.');
      }

      const BATCH_SIZE = 100;
      let totalSaved = 0;
      let totalNew = 0;
      let totalUpdated = 0;
      let totalFailed = 0;

      for (let i = 0; i < trades.length; i += BATCH_SIZE) {
        const chunk = trades.slice(i, i + BATCH_SIZE);
        const { data: result } = await api.post('/save-bulk-trades', {
          trades: chunk,
          broker_connection_id: brokerConnectionId,
        });

        if (result.success) {
          totalSaved += result.savedCount !== undefined ? result.savedCount : chunk.length;
          totalNew += result.newTradesCount !== undefined ? result.newTradesCount : (result.savedCount || chunk.length);
          totalUpdated += result.updatedTradesCount !== undefined ? result.updatedTradesCount : 0;
          totalFailed += result.errorCount || 0;
        } else {
          const firstError = result.results?.find((r) => !r.success)?.error;
          throw new Error(firstError || result.error || 'Failed to save trades. Please check file columns.');
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['trades', user.ID] });

      if (totalNew === 0 && totalSaved > 0) {
        alert(`ℹ️ No new trades found. All ${totalSaved} trades are already up to date.`);
      } else if (totalFailed > 0) {
        alert(`⚠️ Saved ${totalNew} new trades (${totalUpdated} up to date, ${totalFailed} failed).`);
      } else {
        alert(`✅ Successfully saved ${totalNew} new trades${totalUpdated > 0 ? ` (${totalUpdated} up to date)` : ''}!`);
      }
      navigate('/dashboard');
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'File upload failed. Please check the file format and column mappings.';
      alert(errorMessage);
    } finally {
      setIsUploadingTrades(false);
    }
  };

  return (
    <>
      {isUploadingTrades ? <TradeSaveOverlay label="Uploading trades and refreshing dashboard..." /> : null}
      <div id="csv-upload-form" className="w-full flex flex-col gap-4">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.55fr)_minmax(270px,0.75fr)] gap-4 items-stretch">
          {/* Main Upload / Preview Card */}
          <section className="flex flex-col gap-5 p-5 sm:p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--divider-strong)] shadow-xs">
            <header className="flex flex-col gap-1 pb-4 border-b border-[var(--divider-strong)]">
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">File import</span>
              <h2 className="text-lg font-bold text-[var(--heading)] tracking-tight m-0">Import your trades</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 m-0">Choose where these trades belong, then add your CSV, JSON, or HTML statement file.</p>
            </header>

            <div className="flex flex-col gap-1.5 w-full max-w-sm">
              <label htmlFor="csv-account-select" className="text-xs font-bold text-[var(--heading)]">
                Trading account <span className="text-rose-500">*</span>
              </label>
              <CustomSelect
                id="csv-account-select"
                name="csv-account-select"
                className="w-full"
                value={selectedBrokerId ?? ''}
                onChange={changeAccount}
                options={accountOptions}
                placeholder={brokers.length ? 'Choose an account' : 'No trading accounts available'}
                triggerText={selectedBroker ? (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex items-center justify-center size-7 rounded-lg border border-[var(--divider-strong)] bg-[var(--surface-subtle)] shrink-0 overflow-hidden text-[10px] font-bold text-[var(--text-secondary)]" aria-hidden="true">
                      {hasBrokerLogo ? <img src={selectedBroker.logoPath} alt="" className="size-4 object-contain" onError={() => setFailedLogoPath(selectedBroker.logoPath)} /> : brokerInitials}
                    </span>
                    <span className="flex flex-col gap-0.5 min-w-0 text-left">
                      <strong className="text-xs font-bold text-[var(--heading)] truncate">{selectedBroker.accountName || selectedBroker.name}</strong>
                      <small className="text-[10px] text-[var(--text-muted)] truncate">{selectedBroker.name}</small>
                    </span>
                  </div>
                ) : undefined}
                ariaLabel="Choose trading account"
                disabled={brokers.length === 0 || isUploadingTrades}
              />
            </div>

            {!csvData ? (
              <div
                className={`flex flex-col items-center justify-center min-h-[220px] p-6 text-center border-2 border-dashed rounded-2xl transition-all duration-150 ${
                  isDragging
                    ? 'border-brand-solid bg-brand-solid/5 scale-[0.99]'
                    : !brokerConnectionId
                      ? 'border-[var(--divider-strong)] bg-[var(--surface-subtle)] opacity-60 cursor-not-allowed'
                      : 'border-[var(--divider-strong)] bg-[var(--surface-subtle)] hover:border-brand-solid/60'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (brokerConnectionId) setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={handleDrop}
              >
                <div className="flex items-center justify-center size-12 mb-3 rounded-xl border border-[var(--divider-strong)] bg-[var(--bg-card)] text-xs font-black tracking-wider text-[var(--heading)] shadow-xs" aria-hidden="true">
                  FILE
                </div>
                <div className="text-sm font-bold text-[var(--heading)] mb-1">
                  Drop your trade file here
                </div>
                <div className="max-w-sm text-xs text-[var(--text-secondary)] mb-4 leading-relaxed">
                  Supports CSV, Excel (.xlsx/.xls), JSON, or HTML detailed statements (MT4/MT5). Max size: 5 MB.
                </div>
                <Button
                  color="primary"
                  size="md"
                  onClick={() => fileInputRef.current?.click()}
                  isDisabled={!brokerConnectionId}
                >
                  Choose File
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,.json,.html,.htm,.txt,.xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files[0] && handleUploadedFile(e.target.files[0])}
                />
              </div>
            ) : (
              <div className="flex flex-col border border-[var(--divider-strong)] rounded-xl bg-[var(--bg-card)] overflow-hidden shadow-xs" id="csvPreview">
                <div className="flex items-center justify-between gap-3 p-3.5 bg-[var(--surface-subtle)] border-b border-[var(--divider-strong)]">
                  <div>
                    <span className="block text-[10px] font-extrabold uppercase tracking-wider text-emerald-500">File ready</span>
                    <h4 className="text-xs font-bold text-[var(--heading)] m-0">Previewing the first 5 rows</h4>
                  </div>
                  <Button color="link-destructive" size="xs" onClick={removeFile}>Remove file</Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-[var(--surface-subtle)] text-[var(--heading)] font-bold border-b border-[var(--divider-strong)]">
                      <tr>
                        <th className="px-3 py-2 border-r border-[var(--divider-strong)]">Symbol</th>
                        <th className="px-3 py-2 border-r border-[var(--divider-strong)]">Type</th>
                        <th className="px-3 py-2 border-r border-[var(--divider-strong)]">Quantity</th>
                        <th className="px-3 py-2 border-r border-[var(--divider-strong)]">Entry Price</th>
                        <th className="px-3 py-2 border-r border-[var(--divider-strong)]">Exit Price</th>
                        <th className="px-3 py-2 border-r border-[var(--divider-strong)]">P&amp;L</th>
                        <th className="px-3 py-2">Open Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--divider-strong)]">
                      {previewData.map((trade, index) => {
                        const rawPnl = trade.net_pnl ?? trade.pnl;
                        const parsedPnl = parseTradeNumber(rawPnl, { required: false });
                        const hasPnl = rawPnl !== undefined && rawPnl !== null && rawPnl !== '';
                        const pnlValue = hasPnl && parsedPnl !== null ? parsedPnl.toFixed(2) : '';
                        const pnlClass = hasPnl && parsedPnl !== null ? (parsedPnl >= 0 ? 'profit' : 'loss') : '';

                        return (
                          <tr key={index} className="hover:bg-[var(--surface-subtle)] transition-colors">
                            <td className="px-3 py-2 font-semibold text-[var(--heading)] border-r border-[var(--divider-strong)]">{trade.symbol || ''}</td>
                            <td className="px-3 py-2 text-[var(--text-secondary)] border-r border-[var(--divider-strong)]">{trade.side || ''}</td>
                            <td className="px-3 py-2 text-[var(--text-secondary)] border-r border-[var(--divider-strong)]">{trade.quantity || ''}</td>
                            <td className="px-3 py-2 text-[var(--text-secondary)] border-r border-[var(--divider-strong)]">{trade.entry_price || ''}</td>
                            <td className="px-3 py-2 text-[var(--text-secondary)] border-r border-[var(--divider-strong)]">{trade.exit_price || ''}</td>
                            <td className={`px-3 py-2 font-bold border-r border-[var(--divider-strong)] ${pnlClass === 'profit' ? 'text-emerald-500' : pnlClass === 'loss' ? 'text-rose-500' : 'text-[var(--text-secondary)]'}`}>{pnlValue ? '' + pnlValue : ''}</td>
                            <td className="px-3 py-2 text-[var(--text-secondary)]">{trade.entry_timestamp ? formatDateTime(trade.entry_timestamp) : ''}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* Right: Import Guide */}
          <aside className="flex flex-col justify-between gap-6 p-5 sm:p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--divider-strong)] shadow-xs">
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--divider-strong)]">
                <div className="flex flex-wrap gap-1.5" aria-label="Import details">
                  <span className="px-2.5 py-1 rounded-full bg-brand-solid/10 text-brand-solid text-[10px] font-bold">All Formats</span>
                  <span className="px-2.5 py-1 rounded-full bg-[var(--surface-subtle)] border border-[var(--divider-strong)] text-[var(--text-secondary)] text-[10px] font-bold">Up to 5 MB</span>
                  <span className="px-2.5 py-1 rounded-full bg-[var(--surface-subtle)] border border-[var(--divider-strong)] text-[var(--text-secondary)] text-[10px] font-bold">Preview first</span>
                </div>
                {selectedBroker ? (
                  <span className="flex items-center justify-center size-9 rounded-xl border border-[var(--divider-strong)] bg-[var(--surface-subtle)] shrink-0 overflow-hidden text-[10px] font-black text-[var(--text-secondary)]" aria-hidden="true">
                    {hasBrokerLogo ? <img src={selectedBroker.logoPath} alt="" className="size-5 object-contain" onError={() => setFailedLogoPath(selectedBroker.logoPath)} /> : brokerInitials}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-bold text-[var(--heading)] m-0">Before you upload</h3>
                <ol className="m-0 p-0 list-none flex flex-col gap-3">
                  <li className="grid grid-cols-[24px_1fr] gap-3 items-start">
                    <span className="flex items-center justify-center size-6 rounded-lg bg-brand-solid/10 border border-brand-solid/20 text-brand-solid text-xs font-bold">1</span>
                    <p className="m-0 flex flex-col gap-0.5"><strong className="text-xs font-bold text-[var(--heading)]">Export your trades</strong><small className="text-[11px] text-[var(--text-secondary)] leading-relaxed">Download the trade history from your broker as a CSV, JSON, or HTML statement.</small></p>
                  </li>
                  <li className="grid grid-cols-[24px_1fr] gap-3 items-start">
                    <span className="flex items-center justify-center size-6 rounded-lg bg-brand-solid/10 border border-brand-solid/20 text-brand-solid text-xs font-bold">2</span>
                    <p className="m-0 flex flex-col gap-0.5"><strong className="text-xs font-bold text-[var(--heading)]">Keep the original columns</strong><small className="text-[11px] text-[var(--text-secondary)] leading-relaxed">Leave the exported headers and timestamps unchanged.</small></p>
                  </li>
                  <li className="grid grid-cols-[24px_1fr] gap-3 items-start">
                    <span className="flex items-center justify-center size-6 rounded-lg bg-brand-solid/10 border border-brand-solid/20 text-brand-solid text-xs font-bold">3</span>
                    <p className="m-0 flex flex-col gap-0.5"><strong className="text-xs font-bold text-[var(--heading)]">Review the preview</strong><small className="text-[11px] text-[var(--text-secondary)] leading-relaxed">Check the first rows before adding the trades.</small></p>
                  </li>
                </ol>
              </div>
            </div>
          </aside>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button color="secondary" size="md" onClick={() => navigate('/')} isDisabled={isUploadingTrades}>
            Cancel
          </Button>
          <Button
            color="primary"
            size="md"
            onClick={submitUploadedTrades}
            isDisabled={!csvData || !brokerConnectionId || isUploadingTrades}
            isLoading={isUploadingTrades}
            id="submitCSVBtn"
          >
            {isUploadingTrades ? 'Uploading trades...' : 'Upload Trades'}
          </Button>
        </div>
      </div>
    </>
  );
}

export default FileUploadForm;
