# Deja Vu

Local-first AI memory for agents and assistants.

Deja Vu is a small open-source memory layer that helps AI tools remember useful context without locking that context inside one app. It stores memories locally, exposes them through Python, a CLI, a local REST API, and MCP, and uses Venice through an OpenAI-compatible provider interface.

The project is inspired by the ideas in the memory white paper and by the practical developer experience of the original `mem0ai/mem0` GitHub project, with a stronger focus on local ownership, simple setup, and privacy by default.

## What It Does

- Saves long-term memories to a local SQLite database
- Searches memories by user or agent context
- Works from Python, the command line, REST, or MCP
- Uses Venice for memory extraction and reasoning
- Keeps telemetry off
- Avoids cloud storage by default

## Quick Start

```bash
pip install dejavu-memory
dejavu init
dejavu add "I prefer concise technical explanations"
dejavu search "How should responses be written for me?"
```

## Python Example

```python
from dejavu import Memory

memory = Memory()
memory.add("I prefer local-first tools.", user_id="local_user")

results = memory.search("What tools do I prefer?", user_id="local_user")
print(results)
```

## Local API

```bash
dejavu serve
curl http://127.0.0.1:8765/health
```

## MCP

Deja Vu can run as an MCP server so local agents and editors can share the same memory store.

```json
{
  "mcpServers": {
    "dejavu": {
      "command": "dejavu",
      "args": ["mcp"],
      "env": {
        "VENICE_API_KEY": "your-key"
      }
    }
  }
}
```

## Privacy

Memories are stored under `~/.dejavu` by default. LLM calls go through Venice's API, telemetry is disabled, and there is no hosted memory account required for normal local use.

## Background

The goal is to make AI memory feel boring and dependable: easy to run, easy to inspect, and easy to move between tools. The design follows the white paper's long-term memory direction while keeping the first public version focused on the parts people can actually use right away.

## Attribution

Deja Vu is based on the open-source work from `mem0ai/mem0` and keeps the project under the Apache-2.0 license.
