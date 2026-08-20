export const features = [
  {
    icon: 'sync',
    title: 'Broker Auto Sync',
    description: 'Seamlessly connect and sync your trades automatically from major brokers.',
    detailedDescription: 'Import trades through supported broker APIs or CSV, including commissions and swaps, then review them in one journal.',
    image: '/assets/landing/market-terminal.png',
    color: 'text-blue-400'
  },
  {
    icon: 'upload_file',
    title: 'Manual & CSV Upload',
    description: 'Flexibly import your historical trade data via CSV or manual entry.',
    detailedDescription: 'Bringing years of history from another platform? Our smart CSV mapper recognizes formats from over 50+ brokers. For custom strategies, our manual entry form captures 20+ data points including mental state.',
    image: '/assets/landing/csv-upload.png',
    color: 'text-emerald-400'
  },
  {
    icon: 'auto_awesome',
    title: 'AI Review',
    description: 'Get personalized AI insights and performance critiques for every trade.',
    detailedDescription: 'Our proprietary LLM analyzes your entry, exit, and stop-loss placement against historical patterns. It identifies "Tilt" or "Revenge Trading" before you even realize it yourself.',
    image: '/assets/landing/ai-analysis.png',
    color: 'text-purple-400'
  },
  {
    icon: 'play_circle',
    title: 'Replay & Analyze',
    description: 'Replay your past trades bar-by-bar to analyze your decision-making.',
    detailedDescription: 'The ultimate training tool. Re-live any trade in your journal. Hide the future bars and see if you would make the same decision today. Perfect for refining your price action reading skills.',
    image: '/assets/landing/trade-detail-strategy.png',
    color: 'text-amber-400'
  },
  {
    icon: 'science',
    title: 'Backtesting Software',
    description: 'Professional-grade engine to test your strategies against historical data.',
    detailedDescription: 'Don\'t trade on hope. Build and test complex strategies with our backtesting engine. Supports multiple timeframes, tick-level precision, and produces institutional-grade equity curves.',
    image: '/assets/landing/market-terminal.png',
    color: 'text-rose-400'
  },
  {
    icon: 'account_balance_wallet',
    title: 'Funded Account Tracker',
    description: 'Track multiple funded accounts in a single, unified dashboard.',
    detailedDescription: 'Manage your prop firm accounts in one place. Monitor drawdown limits, profit targets, and consistency rules for FTMO, MyForexFunds, and others. Never blow an account due to missed rules again.',
    image: '/assets/landing/stats-cards.png',
    color: 'text-cyan-400'
  },
  {
    icon: 'psychology',
    title: 'Behavioral Tracking',
    description: 'Identify emotional patterns and behavior habits based on your trading stats.',
    detailedDescription: 'Trading is 90% psychology. Our tracker maps your performance to your emotional tags. Discover why you lose on Mondays or why you tend to over-trade after a big win.',
    image: '/assets/landing/progress-tracker.png',
    color: 'text-indigo-400'
  },
  {
    icon: 'terminal',
    title: 'Strategy Algo',
    description: 'Custom algorithmic conversion for your proven strategies (Selected Users Only).',
    detailedDescription: 'Have a winning manual strategy? Our engineering team helps you convert it into a fully automated EA or Bot. Bridging the gap between manual intuition and algorithmic execution.',
    image: '/assets/landing/economic-calendar.png',
    color: 'text-teal-400'
  }
];

export const brokers = [
  { name: 'MT5', logo: '/assets/icons/Markets.svg' },
  { name: 'Binance', logo: '/assets/crypto/color/btc.svg' },
  { name: 'Bitget', logo: '/assets/crypto/color/generic.svg' },
  { name: 'Coinbase', logo: '/assets/crypto/color/usdc.svg' },
  { name: 'Bybit', logo: '/assets/crypto/color/eth.svg' },
  { name: 'Exness', logo: '/assets/broker/exness%20image.svg' },
  { name: 'XM', logo: '/assets/broker/xm.svg' },
  { name: 'IC Markets', logo: '/assets/icons/Markets.svg' }
];

export const pricingPlans = [
  {
    name: 'Free',
    tagline: 'Essential journal for beginners.',
    price: '$0',
    period: '/mo',
    features: [
      '30 trades per month',
      'Basic analytics',
      'Trade calendar',
      'Standard Setup Tags'
    ],
    lockedFeatures: [
      'Replay Backtesting'
    ],
    buttonText: 'Get Started',
    popular: false
  },
  {
    name: 'Pro',
    tagline: 'For serious daily traders.',
    price: '$29',
    period: '/mo',
    features: [
      'Unlimited trade logs',
      '10 Replay sessions /mo',
      'Advanced psychological tags',
      'Broker API imports',
      'Custom Risk Management',
      'Advanced filtering'
    ],
    lockedFeatures: [],
    buttonText: 'Choose Pro',
    popular: true
  },
  {
    name: 'Elite',
    tagline: 'The ultimate edge for professionals.',
    price: '$49',
    period: '/mo',
    features: [
      'Unrestricted performance suite',
      'Unlimited Replay sessions',
      'Multi-Account management',
      'Priority Strategy API',
      'Private 1-on-1 performance review',
      'Priority support'
    ],
    lockedFeatures: [],
    buttonText: 'Choose Elite',
    popular: false
  }
];
