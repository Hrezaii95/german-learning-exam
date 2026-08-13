# Claude–Codex Organization and Delivery Flow

Status: project operating view  
Machine-readable authority: `../config/claude-codex-operating-model.yaml`

```mermaid
flowchart TB
    OWNER["Owner · scope and acceptance authority"]
    CC["Claude Code ORCH · primary workforce and context owner"]
    SCOPE{"Project scope proposal\napproved in Claude chat?"}

    OWNER -->|goals, priorities, approval| CC
    CC --> SCOPE
    SCOPE -->|default current-project scope| STUDIO
    SCOPE -->|approved expansion or reduction| OVERRIDE["Record scope override in YAML or decision row"]
    OVERRIDE --> STUDIO

    subgraph CLAUDE["Claude Max 5 organization · high-volume execution"]
      C_CONTENT["Source and German-content audit"]
      C_ARCH["Architecture and data contracts"]
      C_WEB["React / Next implementation"]
      C_LEARN["Learning, mastery, review and persistence"]
      C_A11Y["Accessibility and behavioral tests"]
      C_RELEASE["GitHub Pages, CI, release evidence"]
    end

    CC --> C_CONTENT
    CC --> C_ARCH
    CC --> C_WEB
    CC --> C_LEARN
    CC --> C_A11Y
    CC --> C_RELEASE

    subgraph STUDIO["Codex specialist studio · highest marginal quality"]
      UX["CDX-UX · senior UX/UI director"]
      INFO["CDX-INFO · semantic infographic designer"]
      IMG["CDX-IMG · image generation and editing"]
      AUD["CDX-AUD · TTS and technical audio QA"]
      VQA["CDX-VQA · responsive visual and media critic"]
    end

    UX -->|chosen direction and design contract| INFO
    UX --> IMG
    INFO --> ASSETS["Versioned media/design artifacts + structured result"]
    IMG --> ASSETS
    AUD --> ASSETS
    ASSETS --> VQA
    VQA -->|accepted artifacts and precise rework list| CC

    C_CONTENT --> INVENTORY["Canonical content and asset inventory"]
    INVENTORY --> UX
    INVENTORY --> INFO
    INVENTORY --> IMG
    INVENTORY --> AUD

    CC --> INTEGRATE["Claude integration into canonical app"]
    INTEGRATE --> GATES{"Content · behavior · media · a11y · build gates"}
    GATES -->|red| CC
    GATES -->|visual/media rework| STUDIO
    GATES -->|green engineering; human gates explicit| DEPLOY["Automatic GitHub Pages deploy"]
    DEPLOY --> OWNER
```

## Fast operating loop

```mermaid
flowchart LR
    A["Claude derives exact missing-ID inventory"] --> B{"Best executor?"}
    B -->|code, content, tests, deploy| C["Claude worker"]
    B -->|UX, image, infographic, TTS, visual QA| D["Codex specialist"]
    D --> E["Inspect actual artifact"]
    E -->|reject| F["One precise retry; max two"]
    F --> D
    E -->|accept| G["Claude integrates"]
    C --> H["Shared gates"]
    G --> H
    H -->|gap remains| A
    H -->|complete or named human blocker| I["Release evidence / owner decision"]
```

The diagrams describe roles, not simultaneous permanent processes. Claude starts only the workers needed for the current inventory and stops them when their bounded artifacts are accepted.
