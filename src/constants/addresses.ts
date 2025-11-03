const VITE_TEST_NODE_API = import.meta.env.VITE_TEST_NODE_API;
const GRAPH_SEPOLIA: string = import.meta.env.VITE_GRAPH_SEPOLIA;
const GRAPH_MAINNET: string = import.meta.env.VITE_GRAPH_MAINNET;
const GRAPH_BASE: string = import.meta.env.VITE_GRAPH_BASE;
const GRAPH_BASE_SEPOLIA: string = import.meta.env.VITE_GRAPH_BASE_SEPOLIA;

type NetworkAddresses = {
  pool?: string;
  licenses?: string;
  swap?: string;
  chypc?: string;
  hypc?: string;
  poolV2?: string;
  poolV3?: string;
  swapV2?: string;
  fundPoolV1?: string;
  shareTokens?: string;
  shareManager?: string;
  oldShareManager?: string;
  migrationHelper?: string;
  usdc?: string;
  CTIP?: string;
};

export const CONTRACT_ADDRESSES: Record<string, NetworkAddresses> = {
  //Sepolia
  Sepolia: {
    pool: "0x7cB852bcD4667b72d49Ff7bBABfB50c35b98626F",
    licenses: "0x096A5d84647d04455ebE68F0aC66312374859Ee9",
    swap: "0x46fA51a4e617C72AaBCDf669014b6a487acbE861",
    chypc: "0x3C56ee0AE9F17F8b32af87B4E3C4Bca4843501B7",
    hypc: "0x640b1274387bf529D016d74161D09c13951867E8",
    poolV2: "0x371a9018F3C63Bc3A89B9f623a65c74E8f40E094",
    poolV3: "0xF22fAdb3CCB1018Ff8d96B0Dd9b46BE0C3bdB60c",
    swapV2: "0x5c3077CC8108b7C4C59A50829c4Aeba9a523e533",
    fundPoolV1: "0xdbF42E4CD2683D796930e7eb0AEA9d7b40aA13D6",
    shareTokens: "0xD0bD9E3a8835197b6804641cbafb9E379a622646",
    shareManager: "0x1491cFd4B3B0708f9fcf848F946D82c251F3188C",
    oldShareManager: "0xa6c6310EFEad949aC5b46DFB32fd65f1898C4Bf4",
    migrationHelper: "0x922DBCf0aAD7eA8f28Eec764C8C3DE7BC6Df83Ab",
    usdc: "0x640b1274387bf529D016d74161D09c13951867E8", // same as hypc for testing
  },
  //Hardhat local environment
  local_host: {
    pool: "0x07ca9BFA779367002cb7276Eb239Adc0C5417664",
    hypc: "0xCB52117ADf6f52179cA9A4ea53e8bddb1Dc6710F",
    chypc: "0x24A3cECe53824Ce99Ee4D761F9Bde77Ff98c24b8",
    swapV2: "0xC25a015C9875AB1c96DCeE14741da39c89B7514C",
    fundPoolV1: "0xc86046a4262D866093265A59C53858D00409B6ba",
    poolV3: "0x293402fBCeCe76E0F7F833d8a785a951c1242d1D",
    poolV2: "0x46C296f99bE750E3a9eDA79c3Ee764571954c0B8",
    shareTokens: "0x07ca9BFA779367002cb7276Eb239Adc0C5417664",
    licenses: "0x444C26D6cAEfD78045E54683814689b72529d433",
  },
  Ethereum: {
    licenses: "0xd32cb5f76989a27782e44c5297aaba728ad61669",
    swap: "0x4F95846E806f19Ba137b6F85f823Db44F0483F0C",
    chypc: "0x0b84DCf0d13678C68Ba9CA976c02eAaA0A44932b",
    hypc: "0xeA7B7DC089c9a4A916B5a7a37617f59fD54e37E4",
    pool: "0xD84135183A735bD886d509E7B05214f1b56ACDB4",
    poolV2: "0x5b3b42f378d49d9822a0612a39b6660f5f156975",
    swapV2: "0x21468e63abF3783020750F7b2e57d4B34aFAfba6",
    shareTokens: "0x4BFbA79CF232361a53eDdd17C67C6c77A6F00379",
    fundPoolV1: "",
    oldShareManager: "0x5A3591001DfB63FAc81d2976C150BB38df2cd71C",
    shareManager: "0xc5d5B9F30AA674aA210a0ec24941bAd7D8b42069",
    migrationHelper: "0xca38E4207d11c005d5c194561335e06a11505E98",
    usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  },
  Base: {
    hypc: "0xEC1024C80e417faa23D9a57f1DfD76457fcf57Ad",
    swapV2: "0xB7F1F7Fa5C795e56386DD4744B4d4681f4f2623A",
    licenses: "0xEaf009f7b9e419546D58F105701314a84B835Fc6",
    shareTokens: "0x32D8eBB6e70BE543Fb759b830BDF7B594a8a85C7",
    shareManager: "0x2b717398C2f034aBc1D4299F853f930c364C8e23",
    CTIP: "0xc9d786a28A6d143533607f4fDC13CAA13Cd42B8C",
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
  "Base Sepolia": {
    hypc: "0x61EBF2408E9b0F221fa38bB2aDAF72f75A13DB4f",
    swapV2: "0xEaf009f7b9e419546D58F105701314a84B835Fc6",
    licenses: "0x32D8eBB6e70BE543Fb759b830BDF7B594a8a85C7",
    shareTokens: "0x32BADa8F4f43A93d53510be7FD498Ad127D475d8",
    shareManager: "0xAE1D005adEA9488663dDD321791124D97aA38fc4",
  },
};
export const GRAPH_URLS = {
  Sepolia: GRAPH_SEPOLIA,
  Ethereum: GRAPH_MAINNET,
  Base: GRAPH_BASE,
  "Base Sepolia": GRAPH_BASE_SEPOLIA,
};

export const requiredHypcByLevel = {
  "10": 1024n,
  "11": 2048n,
  "12": 4096n,
  "13": 8192n,
  "14": 16384n,
  "15": 32768n,
  "16": 65536n,
  "17": 131072n,
  "18": 262144n,
  "19": 524288n,
};

export const nodesToCheck: { [key: string]: `https://${string}`[] } = {
  "1": [
    "https://tilling.hyperpg.io/forward/node1/",
    "https://tilling.hyperpg.io/forward/node2/",
    "https://tilling.hyperpg.io/forward/node3/",
    "https://tilling.hyperpg.io/forward/node4/",
  ],
  "11155111": [VITE_TEST_NODE_API],
};
