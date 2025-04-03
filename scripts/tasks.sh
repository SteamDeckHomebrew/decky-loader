#!/usr/bin/env bash
# ./script/task.sh: Run a VSCode task from tasks.json including its dependencies.
#
# Usage: ./script/task.sh TASK_LABEL
#
# This script looks for .vscode/tasks.json in your workspace folder (or current directory)
# and executes the command associated with the given task label.
#
# It also handles the "dependsOn" field recursively.
#
# Requirements: jq sed

required_dependencies=(jq sed)

# Check if the dependencies are installed
for cmd in "${required_dependencies[@]}"; do
    if ! command -v "$cmd" &> /dev/null; then
        echo "Error: '$cmd' is not installed. Please install it and try again." >&2
        exit 1
    fi
done


set -euo pipefail

# Use WORKSPACE_FOLDER if set; otherwise, assume current directory.
WORKSPACE_FOLDER="${WORKSPACE_FOLDER:-$(pwd)}"
TASKS_FILE="$WORKSPACE_FOLDER/.vscode/tasks.json"

if [ ! -f "$TASKS_FILE" ]; then
  echo "Error: tasks.json not found at $TASKS_FILE" >&2
  exit 1
fi

if [ $# -lt 1 ]; then
  echo "Usage: $0 TASK_LABEL" >&2
  exit 1
fi

# Remove comment lines (lines starting with //) from the tasks file to be compliant with the JSON format.
TASKS_JSON=$(sed '/^[[:space:]]*\/\//d' "$TASKS_FILE")

TASK_LABEL="$1"
shift

# run_task recursively looks up the task by label,
# runs any dependencies first, then executes its command.
run_task() {
  local label="$1"
  echo "Looking up task: $label"

  # Get the task object from the cleaned JSON.
  local task
  task=$(echo "$TASKS_JSON" | jq --arg label "$label" -r '.tasks[] | select(.label == $label)')
  if [ -z "$task" ]; then
    echo "Error: Task with label '$label' not found in $TASKS_FILE" >&2
    exit 1
  fi

  # If the task has dependencies, run them first.
  local depends
  depends=$(echo "$task" | jq -r '.dependsOn? // empty')
  if [ -n "$depends" ] && [ "$depends" != "null" ]; then
    # "dependsOn" can be an array or a string.
    if echo "$depends" | jq -e 'if type=="array" then . else empty end' >/dev/null; then
      for dep in $(echo "$depends" | jq -r '.[]'); do
        run_task "$dep"
      done
    else
      run_task "$depends"
    fi
  fi

  # Check if the task has either a command or script.
  local has_command has_script
  has_command=$(echo "$task" | jq -r 'has("command")')
  has_script=$(echo "$task" | jq -r 'has("script")')
  if [[ "$has_command" != "true" && "$has_script" != "true" ]]; then
    echo "Task '$label' has no command or script; skipping execution."
    return
  fi

  # Determine the command to run:
  local cmd=""
  if echo "$task" | jq 'has("command")' | grep -q "true"; then
    cmd=$(echo "$task" | jq -r '.command')
  elif echo "$task" | jq 'has("script")' | grep -q "true"; then
    local script
    script=$(echo "$task" | jq -r '.script')
    local path
    path=$(echo "$task" | jq -r '.path // empty')
    if [ -n "$path" ]; then
      cmd="cd $path && npm run $script"
    else
      cmd="npm run $script"
    fi
  else
    echo "Error: Task '$label' does not have a command or script." >&2
    exit 1
  fi

  # Substitute ${workspaceFolder} with the actual folder path.
  cmd="${cmd//\$\{workspaceFolder\}/$WORKSPACE_FOLDER}"

  echo "Running task '$label': $cmd"
  # Run the task in a subshell so that directory changes don't persist.
  ( eval "$cmd" )
}

run_task "$TASK_LABEL"
