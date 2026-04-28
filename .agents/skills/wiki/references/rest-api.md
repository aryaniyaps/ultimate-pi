# REST API Quick Reference

Use these commands when MCP tools are not available. Requires the Local REST API plugin running in Obsidian (port 27124).

Set your key before running any command:
```bash
API="https://127.0.0.1:27124"
KEY="your-api-key-here"
```

---

## Read a file

```bash
curl -sk \
  -H "Authorization: Bearer $KEY" \
  "$API/vault/wiki/index.md"
```

---

## Create or replace a file

```bash
curl -sk -X PUT \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: text/markdown" \
  --data-binary @local-file.md \
  "$API/vault/wiki/entities/Name.md"
```

Or with inline content:
```bash
curl -sk -X PUT \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: text/markdown" \
  --data "# Page Title

Content here." \
  "$API/vault/wiki/concepts/Name.md"
```

---

## Append to a file

```bash
curl -sk -X POST \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: text/markdown" \
  --data "- New log entry" \
  "$API/vault/wiki/log.md"
```

---

## Patch a frontmatter field

```bash
curl -sk -X PATCH \
  -H "Authorization: Bearer $KEY" \
  -H "Operation: replace" \
  -H "Target-Type: frontmatter" \
  -H "Target: status" \
  -H "Content-Type: application/json" \
  --data '"mature"' \
  "$API/vault/wiki/concepts/Name.md"
```

---

## Append content under a heading

```bash
curl -sk -X PATCH \
  -H "Authorization: Bearer $KEY" \
  -H "Operation: append" \
  -H "Target-Type: heading" \
  -H "Target: Connections" \
  -H "Content-Type: text/markdown" \
  --data "- [[New Page]]" \
  "$API/vault/wiki/entities/Name.md"
```

---

## Search

Simple keyword search:
```bash
curl -sk -X POST \
  -H "Authorization: Bearer $KEY" \
  "$API/search/simple/?query=machine+learning"
```

Dataview query:
```bash
curl -sk -X POST \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/vnd.olrapi.dataview.dql+txt" \
  --data 'TABLE status FROM "wiki" WHERE status = "seed"' \
  "$API/search/"
```

---

## List all tags

```bash
curl -sk \
  -H "Authorization: Bearer $KEY" \
  "$API/tags/"
```

---

## List files in a folder

```bash
curl -sk \
  -H "Authorization: Bearer $KEY" \
  "$API/vault/wiki/entities/"
```
