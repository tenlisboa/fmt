package config

import (
	"fmt"
	"os"

	"github.com/spf13/viper"
)

const ConfigFileName = "config.yaml"

func LoadConfig() (*Config, error) {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(".")

	viper.SetEnvPrefix("FMT")
	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			return &Config{}, nil
		}
		return nil, fmt.Errorf("error reading config file: %w", err)
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, fmt.Errorf("error unmarshaling config: %w", err)
	}

	return &config, nil
}

func SaveConfig(config *Config) error {
	viper.Set("integrations", config.Integrations)
	viper.Set("teams", config.Teams)

	if err := viper.WriteConfigAs(ConfigFileName); err != nil {
		return fmt.Errorf("error writing config file: %w", err)
	}

	return nil
}

func ConfigExists() bool {
	_, err := os.Stat(ConfigFileName)
	return err == nil
}

func SetupDefaults() {
	viper.SetDefault("integrations.jira.url", "")
	viper.SetDefault("integrations.github.organization", "")
	viper.SetDefault("integrations.github.repositories", []string{})
	viper.SetDefault("teams", []Team{})
}
