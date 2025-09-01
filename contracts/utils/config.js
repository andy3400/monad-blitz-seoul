const fs = require('fs');
const path = require('path');

// 네트워크 설정 기본값
const DEFAULT_NETWORKS = {
  monadTestnet: {
    name: 'Monad Testnet',
    chainId: 41454,
    rpcUrl: process.env.MONAD_TESTNET_RPC_URL || process.env.MONAD_RPC_URL,
    factoryAddress: process.env.FACTORY_ADDRESS_MONAD_TESTNET || process.env.FACTORY_ADDRESS
  },
  sepolia: {
    name: 'Sepolia',
    chainId: 11155111,
    rpcUrl: process.env.SEPOLIA_RPC_URL,
    factoryAddress: process.env.FACTORY_ADDRESS_SEPOLIA
  },
  localhost: {
    name: 'Localhost',
    chainId: 31337,
    rpcUrl: 'http://127.0.0.1:8545',
    factoryAddress: process.env.FACTORY_ADDRESS_LOCALHOST
  }
};

async function getNetworkConfig(networkName = 'monadTestnet') {
  const config = DEFAULT_NETWORKS[networkName];
  
  if (!config) {
    throw new Error(`지원하지 않는 네트워크입니다: ${networkName}`);
  }
  
  return {
    ...config,
    networkName
  };
}

async function getFactoryAddress(networkName = 'monadTestnet') {
  const config = await getNetworkConfig(networkName);
  
  if (!config.factoryAddress) {
    // 배포 기록에서 최신 팩토리 주소 찾기
    const deploymentPath = path.join(__dirname, '../deployments');
    
    if (fs.existsSync(deploymentPath)) {
      const files = fs.readdirSync(deploymentPath)
        .filter(file => file.includes(networkName) && file.endsWith('.json'))
        .sort()
        .reverse(); // 최신 파일 먼저
      
      for (const file of files) {
        try {
          const deployment = JSON.parse(fs.readFileSync(path.join(deploymentPath, file), 'utf8'));
          if (deployment.RoundFactory) {
            return deployment.RoundFactory;
          }
        } catch (error) {
          continue;
        }
      }
    }
    
    throw new Error(`${networkName} 네트워크의 팩토리 주소를 찾을 수 없습니다. FACTORY_ADDRESS_${networkName.toUpperCase()} 환경 변수를 설정하거나 --factory 옵션을 사용하세요.`);
  }
  
  return config.factoryAddress;
}

function validateNetworkConnection(networkConfig) {
  if (!networkConfig.rpcUrl) {
    throw new Error(`${networkConfig.name} 네트워크의 RPC URL이 설정되지 않았습니다.`);
  }
  
  // 추가 네트워크 연결 검증 로직을 여기에 추가할 수 있습니다
  return true;
}

function getSupportedNetworks() {
  return Object.keys(DEFAULT_NETWORKS);
}

module.exports = {
  getNetworkConfig,
  getFactoryAddress,
  validateNetworkConnection,
  getSupportedNetworks,
  DEFAULT_NETWORKS
};