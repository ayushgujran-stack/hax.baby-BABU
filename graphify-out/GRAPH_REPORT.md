# Graph Report - Hax baby  (2026-10-18)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 58 nodes · 96 edges · 10 communities (4 shown, 6 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- CartManager
- SoundEngine
- main.js
- package.json
- scripts
- initEasterEggs
- initOdometer
- dependencies
- devDependencies
- vite

## God Nodes (most connected - your core abstractions)
1. `CartManager` - 15 edges
2. `SoundEngine` - 11 edges
3. `sound` - 6 edges
4. `initEasterEggs()` - 5 edges
5. `initOdometer()` - 5 edges
6. `scheduleNextAutoIncrement()` - 4 edges
7. `canvas-confetti` - 4 edges
8. `scripts` - 4 edges
9. `increment()` - 3 edges
10. `initCertificate()` - 2 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (10 total, 6 thin omitted)

### Community 2 - "main.js"
Cohesion: 0.47
Nodes (3): canvas-confetti, sound, initCertificate()

### Community 3 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 4 - "scripts"
Cohesion: 0.50
Nodes (4): scripts, build, dev, preview

### Community 6 - "initOdometer"
Cohesion: 0.83
Nodes (4): initOdometer(), increment(), renderDigits(), scheduleNextAutoIncrement()

## Knowledge Gaps
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `canvas-confetti` connect `main.js` to `package.json`?**
  _High betweenness centrality (0.395) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `initEasterEggs()` (e.g. with `closeSecretModal()` and `openSecretModal()`) actually correct?**
  _`initEasterEggs()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Why does `CartManager` connect `CartManager` to `main.js`?**
  _High betweenness centrality (0.390) - this node is a cross-community bridge._
- **Why does `SoundEngine` connect `SoundEngine` to `main.js`?**
  _High betweenness centrality (0.314) - this node is a cross-community bridge._