package main

import (
	"log"
	"os"

	"github.com/hashicorp/cli"
	_ "github.com/joho/godotenv/autoload"
	"github.com/tenlisboa/fmt/internal/commands"
)

const (
	appName    = "fmt"
	appVersion = "0.1.0"
)

func main() {
	c := cli.NewCLI(appName, appVersion)
	c.Args = os.Args[1:]
	c.Commands = map[string]cli.CommandFactory{
		"init": func() (cli.Command, error) {
			return &commands.InitCommand{}, nil
		},
		"sync": func() (cli.Command, error) {
			return &commands.SyncCommand{}, nil
		},
	}

	exitStatus, err := c.Run()
	if err != nil {
		log.Println(err)
	}

	os.Exit(exitStatus)
}
