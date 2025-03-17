import { OrchestrationConfig } from './../types/agentConfig.type';
import fs from 'fs';
import yaml from 'js-yaml';

class ConfigLoader {
  private static instance: OrchestrationConfig;

  public static getConfig(): OrchestrationConfig {
    if (!ConfigLoader.instance) {
      console.info('Current ENV:', process.env.NEXT_PUBLIC_ENV);

      const env = process.env.NEXT_PUBLIC_ENV || 'local';
      const configPath = `config/orchestration-config.${env}.yaml`;
      ConfigLoader.instance = yaml.load(
        fs.readFileSync(configPath, 'utf8')
      ) as OrchestrationConfig;
    }
    return ConfigLoader.instance;
  }
}

export default ConfigLoader;
