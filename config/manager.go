package config

import (
	"fmt"
	"os"

	"github.com/spf13/viper"
	"gopkg.in/yaml.v3"
)

const ConfigFileName = "config.yaml"

func LoadConfig() (*Config, error) {
	if !ConfigExists() {
		return &Config{}, nil
	}

	data, err := os.ReadFile(ConfigFileName)
	if err != nil {
		return nil, fmt.Errorf("error reading config file: %w", err)
	}

	var config Config
	if err := yaml.Unmarshal(data, &config); err != nil {
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
