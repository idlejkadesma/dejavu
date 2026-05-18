# Privacy

Deja Vu is local-first. Memory history is stored in SQLite at `~/.dejavu/memories.db` unless `DEJAVU_MEMORY_DB` is set. Telemetry, analytics, hosted sync, and cloud storage are disabled in the foundation release.

The only intended network calls are active inference calls to Venice when memory extraction/search requires an LLM.
