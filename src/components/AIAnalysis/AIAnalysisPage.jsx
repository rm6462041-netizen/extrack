import React from "react";
import MainContentWrapper from "../Layout/MainContentWrapper";
import AIAnalysis from "./AIAnalysis";
import "./AIAnalysis.css";

function AIAnalysisPage({ trades = [], currencyCode = "USD" }) {
  return (
    <MainContentWrapper className="ai-analysis-page">
      <div className="ai-analysis-content">
        <AIAnalysis trades={trades} currencyCode={currencyCode} />
      </div>
    </MainContentWrapper>
  );
}

export default AIAnalysisPage;
