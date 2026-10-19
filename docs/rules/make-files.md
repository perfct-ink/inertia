# Make Files

make should be used for forgettable tasks that are common development and production workflows.
Every project should have a make file. The make file should provide all initial provisioning and installing dependencies in make setup.

Some examples are:

- make setup - Setup the environment. Install dependencies. Require everything needed to run up.
- make up - Non destructive setup. If running, `make down`. Build and run in development. Keep running attached. Delete previous build if it exists. No need to delete anything if previous build is removed automatically.
- make dev - Run `make dev` and open it.
- make build - Build for development once.
- make running - Check to see if its running.
- make clean - Clean existing builds and artifacts.
- make down - kill app. Stop docker containers if using docker.
- make help - help for all make commands, grouped by category.
- make all - alias for `make help`
- make deploy - If theres a deployment script that isnt in CI, deploy the app directly.
