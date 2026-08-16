import { 
  SpecializationTrack, 
  DevToolItem, 
  ArchitectureBlueprint, 
  ChecklistItem, 
  CheatSheetCommand, 
  CuratedResource, 
  AIPromptTemplate 
} from '../models/dev-hub.models';

export const SPECIALIZATION_TRACKS: SpecializationTrack[] = [
  {
    id: 'frontend',
    title: 'تطوير الواجهات وتطبيقات الويب',
    titleEn: 'Frontend & Web Engineering',
    badge: 'UI / UX & SPAs',
    icon: 'palette',
    accentColor: 'from-cyan-500 via-blue-500 to-indigo-600',
    textColor: 'text-cyan-400',
    bgLight: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    description: 'بناء واجهات تفاعلية فائقة السرعة، متوافقة مع جميع الشاشات ومعايير الـ Core Web Vitals وSSR/SSG.',
    skills: ['TypeScript', 'React / Next.js', 'Angular', 'Vue.js / Nuxt', 'Tailwind CSS', 'State Management (Zustand, NgRx)', 'Web Performance & SEO', 'Accessibility (WCAG)'],
    quickStats: [
      { label: 'التقنيات الرائدة', value: 'React, Angular, Next.js' },
      { label: 'أهم الأدوات', value: 'Vite, Tailwind, Webpack' },
      { label: 'المعايير الأساسية', value: 'Core Web Vitals, a11y' }
    ],
    roadmapSteps: [
      {
        level: 'أساسي (Foundations)',
        topics: ['HTML5 Semantic Elements', 'CSS Modern (Flexbox, Grid, Custom Properties)', 'JavaScript ES6+ (Async/Await, Closures, DOM API)', 'Git & GitHub Workflow']
      },
      {
        level: 'متوسط (Intermediate)',
        topics: ['TypeScript Deep Dive', 'Component-Driven Architecture', 'Framework Mastery (React/Angular)', 'Client-Side Routing & State Management', 'REST API & Fetch / Axios integration']
      },
      {
        level: 'متقدم (Advanced)',
        topics: ['Server-Side Rendering (SSR / Hydration)', 'Micro-Frontends & Module Federation', 'Web Performance Optimization (LCP, FID, CLS, Tree-shaking)', 'Testing (Jest, Vitest, Playwright, Cypress)']
      },
      {
        level: 'خبير (Mastery)',
        topics: ['Design Systems & Headless UI', 'WebAssembly (WASM) & Canvas / WebGL', 'Edge Rendering & Islands Architecture', 'Progressive Web Apps (PWA) & Service Workers']
      }
    ]
  },
  {
    id: 'backend',
    title: 'الأنظمة الخلفية والحوسبة السحابية',
    titleEn: 'Backend & Cloud Architecture',
    badge: 'APIs & Microservices',
    icon: 'server',
    accentColor: 'from-emerald-500 via-teal-500 to-cyan-600',
    textColor: 'text-emerald-400',
    bgLight: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    description: 'تصميم وبناء خوادم مستقرة وآمنة، واجهات برمجية عالية الأداء (REST/GraphQL/gRPC)، وإدارة قواعد البيانات الموزعة.',
    skills: ['Node.js / Express / NestJS', 'Python (FastAPI, Django)', 'Go (Golang)', 'PostgreSQL / Redis / MongoDB', 'Docker & Containerization', 'gRPC & Message Queues (Kafka, RabbitMQ)', 'API Security & OAuth2/JWT'],
    quickStats: [
      { label: 'لغات الخوادم', value: 'Go, Node.js, Python, Java' },
      { label: 'أنماط الاتصال', value: 'REST, GraphQL, gRPC, WebSocket' },
      { label: 'طوابير الرسائل', value: 'Kafka, RabbitMQ, Redis Pub/Sub' }
    ],
    roadmapSteps: [
      {
        level: 'أساسي (Foundations)',
        topics: ['HTTP/HTTPS Protocols & Status Codes', 'Backend Runtime (Node.js/Python/Go)', 'Relational Databases (SQL & Normalization)', 'CRUD RESTful API Principles']
      },
      {
        level: 'متوسط (Intermediate)',
        topics: ['Authentication & Authorization (JWT, OAuth2, RBAC)', 'ORMs & Query Builders (Prisma, Drizzle, TypeORM)', 'Caching Strategies with Redis', 'Dockerizing Apps & Multi-stage builds']
      },
      {
        level: 'متقدم (Advanced)',
        topics: ['Microservices Architecture & API Gateways', 'Message Brokers (RabbitMQ, Apache Kafka, BullMQ)', 'Event-Driven Systems & CQRS', 'Database Indexing, Partitioning & Connection Pooling']
      },
      {
        level: 'خبير (Mastery)',
        topics: ['Distributed Systems & Raft/Paxos Consensus', 'High Availability, Zero-Downtime Deployments & Auto-scaling', 'Rate Limiting, DDoS Mitigation & WAF', 'Observability (OpenTelemetry, Distributed Tracing)']
      }
    ]
  },
  {
    id: 'fullstack',
    title: 'التطوير الشامل (Full-Stack)',
    titleEn: 'Full-Stack Engineering',
    badge: 'End-to-End Products',
    icon: 'layers',
    accentColor: 'from-purple-500 via-indigo-500 to-blue-600',
    textColor: 'text-purple-400',
    bgLight: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    description: 'بناء المنتجات الرقمية المتكاملة من واجهة المستخدم وحتى الخوادم وقواعد البيانات، مع إدارة دورة حياة التطبيق بالكامل.',
    skills: ['Next.js / T3 Stack / Angular + NestJS', 'PostgreSQL / Prisma', 'TypeScript End-to-End (tRPC, Zod)', 'Auth (Clerk, Auth.js, Firebase Auth)', 'CI/CD & Cloud Deployment (Vercel, AWS, Fly.io)'],
    quickStats: [
      { label: 'الستاك الأشهر', value: 'Next.js + Prisma + Postgres' },
      { label: 'النوع الصارم', value: 'TypeScript + tRPC + Zod' },
      { label: 'الاستضافة', value: 'Vercel, Railway, Supabase' }
    ],
    roadmapSteps: [
      {
        level: 'أساسي (Foundations)',
        topics: ['Unified TypeScript across Stack', 'Client-Server Communication Lifecycle', 'Basic SQL & Relational Schema Modeling', 'Git Branching & Deployment Workflows']
      },
      {
        level: 'متوسط (Intermediate)',
        topics: ['Full-Stack Frameworks (Next.js App Router, Remix, Nuxt)', 'Type-Safe APIs with tRPC / OpenAPI', 'Schema Validation with Zod / Valibot', 'Database Migrations & Seeders']
      },
      {
        level: 'متقدم (Advanced)',
        topics: ['Monorepos (Turborepo, Nx)', 'Stripe / Payment Gateway Integration', 'Server Actions & Optimistic UI Updates', 'File Storage & S3 / Cloudflare R2 Uploads']
      },
      {
        level: 'خبير (Mastery)',
        topics: ['Multi-Tenant SaaS Architecture', 'Real-Time Sync (WebSockets, SSE, CRDTs)', 'Cross-Platform App Sharing (React Native / Electron)', 'Disaster Recovery & Cost Optimization']
      }
    ]
  },
  {
    id: 'mobile',
    title: 'تطبيقات الهواتف الذكية (Mobile Apps)',
    titleEn: 'Mobile Application Engineering',
    badge: 'iOS & Android',
    icon: 'smartphone',
    accentColor: 'from-amber-500 via-orange-500 to-red-500',
    textColor: 'text-amber-400',
    bgLight: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    description: 'تطوير تطبيقات الهواتف الذكية الأصلية وعابرة للمنصات (Cross-Platform) بأداء فائق وتجربة مستخدم سلسة.',
    skills: ['Flutter & Dart', 'React Native / Expo', 'Kotlin / Android', 'Swift / SwiftUI', 'Offline-First & Local DB (SQLite, Hive, WatermelonDB)', 'Push Notifications (FCM, APNs)', 'Store Publishing & Fastlane'],
    quickStats: [
      { label: 'أشهر المنصات', value: 'Flutter, React Native / Expo' },
      { label: 'التخزين المحلي', value: 'SQLite, Realm, Hive' },
      { label: 'الأتمتة', value: 'Fastlane, Codemagic' }
    ],
    roadmapSteps: [
      {
        level: 'أساسي (Foundations)',
        topics: ['Dart / JavaScript / Kotlin / Swift Basics', 'Mobile Lifecycle & UI Widget Trees', 'Adaptive Layouts & Multi-Screen Densities', 'Navigation Stacks & Deep Linking']
      },
      {
        level: 'متوسط (Intermediate)',
        topics: ['State Management (Bloc/Riverpod/Zustand)', 'Local Storage & Offline Caching', 'Camera, GPS, Biometrics & Hardware APIs', 'Secure Storage (Keystore / Keychain)']
      },
      {
        level: 'متقدم (Advanced)',
        topics: ['Push Notifications & Background Tasks', 'In-App Purchases & Subscriptions (RevenueCat)', 'Native Bridges & Method Channels', 'App Size & Startup Time Optimization']
      },
      {
        level: 'خبير (Mastery)',
        topics: ['CI/CD Pipeline with Fastlane & GitHub Actions', 'Crash Reporting & Telemetry (Sentry, Firebase Crashlytics)', 'App Store & Google Play Optimization (ASO)', 'Multi-flavor Builds (Dev, Staging, Prod)']
      }
    ]
  },
  {
    id: 'devops',
    title: 'العمليات السحابية وإدارة النظم (DevOps & SRE)',
    titleEn: 'DevOps & Cloud Infrastructure',
    badge: 'CI/CD & Cloud',
    icon: 'workflow',
    accentColor: 'from-blue-600 via-indigo-600 to-violet-700',
    textColor: 'text-blue-400',
    bgLight: 'bg-blue-600/10',
    borderColor: 'border-blue-500/30',
    description: 'أتمتة دورة النشر، إدارة الحاويات والبنية التحتية ككود (IaC)، وضمان استقرار الخوادم ومراقبتها 24/7.',
    skills: ['Docker & Containerd', 'Kubernetes (K8s) & Helm', 'GitHub Actions / GitLab CI', 'Terraform & Pulumi', 'Linux Administration & Bash', 'AWS / GCP / Azure', 'Prometheus & Grafana'],
    quickStats: [
      { label: 'الحاويات', value: 'Docker, Kubernetes, Podman' },
      { label: 'البنية ككود', value: 'Terraform, Ansible, Pulumi' },
      { label: 'المراقبة', value: 'Prometheus, Grafana, Loki' }
    ],
    roadmapSteps: [
      {
        level: 'أساسي (Foundations)',
        topics: ['Linux System Administration & Permissions', 'Bash Scripting & CLI Automation', 'Networking (TCP/IP, DNS, SSL/TLS, Nginx Reverse Proxy)', 'GitOps Fundamentals']
      },
      {
        level: 'متوسط (Intermediate)',
        topics: ['Docker Multi-stage Builds & Optimization', 'CI/CD Pipelines (GitHub Actions / GitLab CI)', 'Cloud Provider Core Services (VPC, EC2/Compute, S3/Buckets)', 'Secrets Management (Vault, AWS Secrets Manager)']
      },
      {
        level: 'متقدم (Advanced)',
        topics: ['Kubernetes Orchestration (Deployments, Services, Ingress)', 'Infrastructure as Code with Terraform', 'Helm Charts & Package Management', 'Log Aggregation & Monitoring (ELK, Prometheus, Grafana)']
      },
      {
        level: 'خبير (Mastery)',
        topics: ['Service Mesh (Istio, Linkerd)', 'Chaos Engineering & SRE Practices', 'Zero-Trust Architecture & Cloud Security Audits', 'FinOps & Cloud Cost Governance']
      }
    ]
  },
  {
    id: 'ai',
    title: 'الذكاء الاصطناعي وهندسة البيانات',
    titleEn: 'AI & Data Science Engineering',
    badge: 'LLMs & Machine Learning',
    icon: 'sparkles',
    accentColor: 'from-fuchsia-500 via-pink-500 to-rose-600',
    textColor: 'text-fuchsia-400',
    bgLight: 'bg-fuchsia-500/10',
    borderColor: 'border-fuchsia-500/30',
    description: 'دمج النماذج اللغوية الكبيرة (LLMs)، تدريب النماذج، بناء أنظمة RAG، وتصميم خطوط المعالجة للبيانات الضخمة.',
    skills: ['Python / PyTorch / HuggingFace', 'LangChain / LlamaIndex', 'Vector Databases (Chroma, Pinecone, Qdrant)', 'Prompt Engineering & Function Calling', 'OpenAI / Anthropic / Gemini APIs', 'Fine-tuning & LoRA', 'Data Pipelines (Pandas, Polars)'],
    quickStats: [
      { label: 'أطر العمل', value: 'PyTorch, LangChain, LlamaIndex' },
      { label: 'قواعد المتجهات', value: 'Pinecone, Qdrant, Milvus, Chroma' },
      { label: 'النماذج', value: 'Claude, GPT-4, Llama 3, Mistral' }
    ],
    roadmapSteps: [
      {
        level: 'أساسي (Foundations)',
        topics: ['Python Data Stack (NumPy, Pandas, Matplotlib)', 'Linear Algebra, Calculus & Statistics Basics', 'Supervised vs Unsupervised ML Algorithms', 'Jupyter Notebooks & Experimentation']
      },
      {
        level: 'متوسط (Intermediate)',
        topics: ['Deep Learning with PyTorch / TensorFlow', 'Transformer Architecture & Self-Attention', 'NLP & Computer Vision Fundamentals', 'Integrating LLM APIs & Structured Outputs']
      },
      {
        level: 'متقدم (Advanced)',
        topics: ['Retrieval-Augmented Generation (RAG) Architecture', 'Vector Search & Embedding Chunking Strategies', 'Autonomous Agents & Tool Calling Workflows', 'Model Evaluation & Benchmark Frameworks']
      },
      {
        level: 'خبير (Mastery)',
        topics: ['Fine-Tuning (LoRA, QLoRA, SFT)', 'LLM Serving & Quantization (vLLM, Ollama, TensorRT-LLM)', 'Multimodal AI Pipelines (Vision + Audio + Text)', 'AI Safety, Guardrails & Red-Teaming']
      }
    ]
  },
  {
    id: 'gamedev',
    title: 'تطوير الألعاب والرسوميات (Game Dev & 3D)',
    titleEn: 'Game Development & Graphics',
    badge: '2D / 3D & Shaders',
    icon: 'gamepad-2',
    accentColor: 'from-amber-400 via-rose-500 to-indigo-600',
    textColor: 'text-amber-400',
    bgLight: 'bg-amber-400/10',
    borderColor: 'border-amber-400/30',
    description: 'صناعة ألعاب الفيديو ثنائية وثلاثية الأبعاد، محاكاة الفيزياء، كتابة الـ Shaders، وتطوير تجارب الويب التفاعلية ثلاثية الأبعاد.',
    skills: ['Godot Engine (GDScript / C#)', 'Unity (C#)', 'Unreal Engine (C++ / Blueprints)', 'Three.js / WebGL / WebGPU', 'Shaders (GLSL / HLSL)', 'Game Math (Vectors, Quaternions, Matrices)', 'Audio & Physics Engines'],
    quickStats: [
      { label: 'محركات الألعاب', value: 'Godot, Unity, Unreal, Three.js' },
      { label: 'لغات التطوير', value: 'C#, C++, GDScript, GLSL' },
      { label: 'الرسوميات', value: 'WebGL, WebGPU, Vulkan' }
    ],
    roadmapSteps: [
      {
        level: 'أساسي (Foundations)',
        topics: ['Game Loop & Frame-Rate Independence', '2D Math: Vectors, Coordinates & Collisions', 'Sprite Animation & Tilemaps', 'Input Handling & Audio Systems']
      },
      {
        level: 'متوسط (Intermediate)',
        topics: ['3D Math: Quaternions, Matrix Transformations', 'State Machines & Character Controllers', 'Particle Systems & Lighting Techniques', 'Scene Management & Level Design']
      },
      {
        level: 'متقدم (Advanced)',
        topics: ['Custom Shaders (Vertex & Fragment / Compute)', 'Multiplayer Networking & Client-Side Prediction', 'Asset Pipeline & LOD (Level of Detail) Optimization', 'Pathfinding (A* & NavMesh) & Game AI']
      },
      {
        level: 'خبير (Mastery)',
        topics: ['WebAssembly & WebGPU Rendering in Browser', 'Custom Game Engine Architecture (ECS Pattern)', 'VR / AR / Spatial Computing Development', 'Profiling CPU/GPU Draw Calls & Memory Optimization']
      }
    ]
  },
  {
    id: 'security',
    title: 'الأمن السيبراني واختبار الاختراق',
    titleEn: 'Cybersecurity & Ethical Hacking',
    badge: 'AppSec & InfoSec',
    icon: 'shield-check',
    accentColor: 'from-red-500 via-rose-600 to-pink-700',
    textColor: 'text-red-400',
    bgLight: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    description: 'تأمين التطبيقات، فحص الثغرات الأمنية، حماية مسارات البيانات، واختبار الاختراق الأخلاقي وفق معايير OWASP.',
    skills: ['OWASP Top 10 Security', 'Web Penetration Testing', 'Cryptography (RSA, AES, ECC, Hashing)', 'Network Security (Wireshark, Nmap)', 'Burp Suite & ZAP', 'API Security & Rate Limiting', 'Hardening Linux & Containers'],
    quickStats: [
      { label: 'المعايير', value: 'OWASP Top 10, NIST, CIS' },
      { label: 'أدوات الفحص', value: 'Burp Suite, Nmap, Metasploit, Snyk' },
      { label: 'التشفير', value: 'AES-256, RSA-4096, Argon2' }
    ],
    roadmapSteps: [
      {
        level: 'أساسي (Foundations)',
        topics: ['OSI Model & TCP/IP Security', 'Linux Permissions & Core Security Commands', 'Cryptography Basics (Symmetric vs Asymmetric, Hashing)', 'HTTP Headers & Browser Security Models (CORS, CSP, SOP)']
      },
      {
        level: 'متوسط (Intermediate)',
        topics: ['OWASP Top 10 Web Vulnerabilities (SQLi, XSS, CSRF, SSRF, IDOR)', 'Authentication Flaws & Session Hijacking', 'Burp Suite & Dynamic Application Security Testing (DAST)', 'Secure Coding Standards & Input Sanitization']
      },
      {
        level: 'متقدم (Advanced)',
        topics: ['API Security Testing (Broken Object Level Auth - BOLA)', 'Container & Cloud Security Posture (Kubernetes, AWS IAM)', 'Static Code Analysis (SAST) & Dependency Audits (Snyk)', 'Network Traffic Analysis with Wireshark & Packet Crafting']
      },
      {
        level: 'خبير (Mastery)',
        topics: ['Zero-Trust Architecture & Enterprise Threat Modeling', 'Red Teaming & Advanced Evasion Techniques', 'Binary Exploitation & Reverse Engineering', 'Incident Response, Forensics & SIEM Monitoring']
      }
    ]
  },
  {
    id: 'database',
    title: 'قواعد البيانات وهندسة البيانات',
    titleEn: 'Database & Data Engineering',
    badge: 'SQL & NoSQL Systems',
    icon: 'database',
    accentColor: 'from-yellow-500 via-amber-600 to-orange-700',
    textColor: 'text-amber-400',
    bgLight: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    description: 'تصميم وبناء قواعد البيانات العلائقية وغير العلائقية، كتابة استعلامات فائقة السرعة، وإدارة مستودعات البيانات الكبيرة.',
    skills: ['PostgreSQL & MySQL', 'MongoDB & Document Stores', 'Redis & In-Memory Caching', 'Query Optimization & Indexing (B-Tree, GIN, GiST)', 'Database Sharding & Replication', 'Apache Kafka / Flink / Spark', 'Data Warehousing (BigQuery, Snowflake, ClickHouse)'],
    quickStats: [
      { label: 'قواعد البيانات', value: 'PostgreSQL, Redis, ClickHouse' },
      { label: 'التحليلات', value: 'BigQuery, Snowflake, DuckDB' },
      { label: 'الفهرسة', value: 'B-Tree, GIN, BRIN, Vector (pgvector)' }
    ],
    roadmapSteps: [
      {
        level: 'أساسي (Foundations)',
        topics: ['Relational Schema Design & Normalization (1NF, 2NF, 3NF)', 'SQL Fundamentals: JOINs, Subqueries, Aggregations', 'ACID Transactions & Isolation Levels', 'CRUD Operations & Basic Constraints']
      },
      {
        level: 'متوسط (Intermediate)',
        topics: ['Indexing Internals (B-Trees, Hash, Composite Indexes)', 'Execution Plans Analysis (EXPLAIN ANALYZE)', 'NoSQL Paradigms: Key-Value, Document, Columnar, Graph', 'Database Migration Tools & Schema Versioning']
      },
      {
        level: 'متقدم (Advanced)',
        topics: ['Replication: Master-Replica, Multi-Master & Failover', 'Horizontal Partitioning & Sharding', 'Time-Series & Analytical Databases (ClickHouse, TimescaleDB)', 'Vector Embeddings in SQL (pgvector, Milvus)']
      },
      {
        level: 'خبير (Mastery)',
        topics: ['Distributed Transactions (2PC, Sagas, Eventual Consistency)', 'ETL / ELT Streaming Pipelines (Kafka, Spark, dbt)', 'Database Performance Tuning & Buffer Pool Optimization', 'Disaster Recovery, Point-in-Time Recovery (PITR) & Backups']
      }
    ]
  },
  {
    id: 'iot',
    title: 'الأنظمة المدمجة وإنترنت الأشياء (Embedded & IoT)',
    titleEn: 'Embedded Systems & IoT',
    badge: 'Hardware & Microcontrollers',
    icon: 'circuit-board',
    accentColor: 'from-teal-400 via-emerald-600 to-cyan-700',
    textColor: 'text-teal-400',
    bgLight: 'bg-teal-500/10',
    borderColor: 'border-teal-500/30',
    description: 'برمجة المتحكمات الدقيقة، قراءة الحساسات، التحكم في المحركات، وتوصيل الأجهزة بالسحابة عبر بروتوكولات IoT.',
    skills: ['C / C++ for Embedded', 'ESP32 & ESP8266 Wi-Fi/BLE', 'Arduino & STM32 Microcontrollers', 'Raspberry Pi & Linux SBCs', 'Communication Protocols (I2C, SPI, UART, CAN)', 'IoT Protocols (MQTT, CoAP, WebSockets)', 'FreeRTOS & Embedded OS'],
    quickStats: [
      { label: 'المتحكمات', value: 'ESP32, STM32, Arduino, Raspberry Pi' },
      { label: 'بروتوكولات الاتصال', value: 'MQTT, I2C, SPI, UART, BLE' },
      { label: 'أنظمة التشغيل', value: 'FreeRTOS, Zephyr, Embedded Linux' }
    ],
    roadmapSteps: [
      {
        level: 'أساسي (Foundations)',
        topics: ['C/C++ Pointer Arithmetic & Bitwise Operations', 'Electronics Basics: Voltage, Current, Resistors, Transistors', 'Digital I/O & Analog ADC / PWM reading', 'Microcontroller Architecture & Registers']
      },
      {
        level: 'متوسط (Intermediate)',
        topics: ['Hardware Protocols: UART, SPI, I2C with Sensor ICs', 'Interrupts (ISRs) & Timers / Watchdog Timer', 'Wireless Communication (Wi-Fi, Bluetooth BLE, LoRa)', 'MQTT Pub/Sub Architecture with Mosquitto Broker']
      },
      {
        level: 'متقدم (Advanced)',
        topics: ['Real-Time Operating Systems (FreeRTOS Tasks, Mutexes, Queues)', 'Power Management & Deep Sleep Modes for Battery IoT', 'Firmware Updates Over-the-Air (OTA)', 'Secure Boot & Hardware Cryptography Modules']
      },
      {
        level: 'خبير (Mastery)',
        topics: ['Embedded Linux & Yocto / Buildroot Systems', 'Edge AI & TinyML (TensorFlow Lite for Microcontrollers)', 'CAN Bus for Automotive & Industrial IoT (Modbus)', 'Custom PCB Design & Schematic Capture (KiCad)']
      }
    ]
  }
];

export const DEV_TOOLS: DevToolItem[] = [
  {
    id: 'json-ts-transformer',
    name: 'محلل ومحول JSON إلى TypeScript',
    nameEn: 'JSON to TypeScript & Formatter',
    category: 'Code Generation & Data',
    icon: 'code-2',
    description: 'تنسيق نصوص JSON والتحقق من صحتها وتوليد واجهات وأنواع TypeScript مباشرة مع حساب الحجم وتصدير سهل.',
    isBuiltIn: true,
    widgetId: 'json-ts',
    trackIds: 'all',
    tags: ['JSON', 'TypeScript', 'Types', 'Validator', 'Formatter']
  },
  {
    id: 'regex-tester',
    name: 'مختبر التعابير النمطية الحي (Regex Playground)',
    nameEn: 'Live Regex Tester & Visualizer',
    category: 'Debugging & Validation',
    icon: 'search',
    description: 'فحص واختبار التعبيرات النمطية (Regular Expressions) بشكل لحظي مع مكتبة جاهزة لأشهر الأنماط.',
    isBuiltIn: true,
    widgetId: 'regex',
    trackIds: 'all',
    tags: ['Regex', 'Pattern Matching', 'Validation', 'Strings']
  },
  {
    id: 'jwt-decoder',
    name: 'محلل وفاحص رموز JWT',
    nameEn: 'JWT Token Inspector & Decoder',
    category: 'Security & Auth',
    icon: 'key',
    description: 'فك تشفير رموز JSON Web Tokens وفحص حمولتها وترويستها وتاريخ الانتهاء بدقة وأمان تام داخل المتصفح.',
    isBuiltIn: true,
    widgetId: 'jwt',
    trackIds: ['frontend', 'backend', 'fullstack', 'mobile', 'security'],
    tags: ['JWT', 'Auth', 'Token', 'Security', 'Payload']
  },
  {
    id: 'crypto-hasher',
    name: 'أداة التشفير والترميز الشاملة (Crypto & Hash Lab)',
    nameEn: 'Crypto, Hash & Base64 Lab',
    category: 'Security & Encoding',
    icon: 'lock',
    description: 'توليد شفرات الهاش (SHA-256, SHA-512, MD5)، ترميز وفك ترميز Base64 و URL و HTML Entities، وتوليد UUID v4.',
    isBuiltIn: true,
    widgetId: 'crypto',
    trackIds: 'all',
    tags: ['Crypto', 'Hash', 'Base64', 'UUID', 'Encoder', 'Decoder']
  },
  {
    id: 'css-visual-lab',
    name: 'مختبر CSS التفاعلي (Gradients, Glass & Shadows)',
    nameEn: 'Modern CSS Visual Generator',
    category: 'Styling & Design',
    icon: 'palette',
    description: 'توليد كود Glassmorphism احترافي، تدرجات عصرية فائقة النقاء، وظلال ثلاثية الأبعاد، ومولد دالة التجاوب clamp().',
    isBuiltIn: true,
    widgetId: 'css-lab',
    trackIds: ['frontend', 'fullstack', 'mobile'],
    tags: ['CSS', 'Glassmorphism', 'Gradients', 'Shadows', 'Clamp', 'Responsive']
  },
  {
    id: 'git-command-builder',
    name: 'مساعد أوامر Git التفاعلي (Git Wizard)',
    nameEn: 'Interactive Git Command Builder',
    category: 'Version Control',
    icon: 'terminal',
    description: 'اختر السيناريو البرمجي الذي تواجهه (تراجع عن commit، حل نزاع، دمج فروع، حذف فرع بعيد) واحصل على الأمر المناسب فوراً.',
    isBuiltIn: true,
    widgetId: 'git-wizard',
    trackIds: 'all',
    tags: ['Git', 'CLI', 'VCS', 'Rebase', 'Merge', 'Commit']
  },
  {
    id: 'http-curl-builder',
    name: 'صانع ومختبر طلبات HTTP & cURL',
    nameEn: 'HTTP Request & cURL Generator',
    category: 'APIs & Networking',
    icon: 'globe',
    description: 'تجهيز طلبات الـ API (GET, POST, PUT, DELETE) مع الترويسات والـ Body وتوليد أوامر cURL وأكواد Fetch و Python تلقائياً.',
    isBuiltIn: true,
    widgetId: 'http-builder',
    trackIds: ['frontend', 'backend', 'fullstack', 'mobile', 'devops', 'security'],
    tags: ['HTTP', 'REST', 'cURL', 'API', 'Fetch', 'Axios']
  },
  {
    id: 'cron-builder',
    name: 'مولد ومفسر تعابير Cron (Cron Schedule Visualizer)',
    nameEn: 'Cron Expression Visualizer & Generator',
    category: 'DevOps & Automation',
    icon: 'clock',
    description: 'بناء تعبيرات الجدولة الزمنية Cron بشكل مرئي مع تفسير لغوي واضح ودقيق باللغتين العربية والإنجليزية.',
    isBuiltIn: true,
    widgetId: 'cron',
    trackIds: ['backend', 'devops', 'fullstack', 'database', 'iot'],
    tags: ['Cron', 'Schedule', 'Jobs', 'DevOps', 'Automation']
  },
  {
    id: 'meta-tags-generator',
    name: 'مولد وسوم الـ SEO و OpenGraph لمواقع الويب',
    nameEn: 'Meta Tags & OpenGraph SEO Generator',
    category: 'SEO & Web',
    icon: 'file-text',
    description: 'توليد وسوم HTML Meta Tags و Social Cards (Twitter, Facebook, LinkedIn) لتعزيز ظهور الموقع وتجربة المشاركة.',
    isBuiltIn: true,
    widgetId: 'seo-meta',
    trackIds: ['frontend', 'fullstack'],
    tags: ['SEO', 'Meta', 'OpenGraph', 'Twitter Cards', 'HTML']
  }
];

export const ARCHITECTURE_BLUEPRINTS: ArchitectureBlueprint[] = [
  {
    id: 'clean-architecture-node',
    title: 'معمارية Clean Architecture / Hexagonal (الأنظمة الخلفية)',
    trackId: 'backend',
    pattern: 'Clean Architecture (Ports & Adapters)',
    description: 'فصل منطق العمل (Domain Logic) تماماً عن أطر العمل وقواعد البيانات لتسهيل الاختبار وإعادة الاستخدام.',
    treeStructure: `src/
├── domain/                  # كيانات ومنطق العمل الصافي (خالي من أي اعتماديات)
│   ├── entities/            # User.ts, Order.ts
│   └── value-objects/       # Email.ts, Money.ts
├── application/             # حالات الاستخدام (Use Cases) والواجهات المجردة
│   ├── use-cases/           # CreateOrderUseCase.ts, RegisterUserUseCase.ts
│   ├── ports/               # IUserRepository.ts, IPaymentGateway.ts
│   └── dtos/                # CreateOrderDTO.ts
├── infrastructure/          # تفاصيل التنفيذ التقني والربط الخارجي
│   ├── persistence/         # PostgresUserRepository.ts, MongoOrderRepository.ts
│   ├── external-services/   # StripePaymentGateway.ts, SendgridEmailService.ts
│   └── config/              # DatabaseConnection.ts
└── presentation/            # طبقة العرض والواجهات البرمجية
    ├── controllers/         # OrderController.ts, AuthController.ts
    ├── middlewares/         # AuthMiddleware.ts, ErrorHandler.ts
    └── routes/              # api.routes.ts`,
    sampleCodeTitle: 'نموذج Use Case في Clean Architecture (TypeScript)',
    sampleCodeLanguage: 'typescript',
    sampleCode: `// Application Layer: Use Case
export class RegisterUserUseCase {
  constructor(
    private userRepository: IUserRepository,
    private hashService: IHashService,
    private eventBus: IEventBus
  ) {}

  async execute(dto: RegisterUserDTO): Promise<UserResponseDTO> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictError('البريد الإلكتروني مسجل مسبقاً');
    }

    const hashedPassword = await this.hashService.hash(dto.password);
    const newUser = User.create({
      email: dto.email,
      name: dto.name,
      passwordHash: hashedPassword
    });

    await this.userRepository.save(newUser);
    await this.eventBus.publish(new UserRegisteredEvent(newUser.id));

    return UserMapper.toDTO(newUser);
  }
}`,
    benefits: [
      'استقلالية تامة عن أطر العمل والمكتبات وقواعد البيانات',
      'سهولة فائقة في كتابة اختبارات الـ Unit Tests بنسبة تغطية 100%',
      'إمكانية تغيير قاعدة البيانات أو إضافة واجهات جديدة (GraphQL, gRPC, CLI) دون لمس منطق العمل'
    ]
  },
  {
    id: 'feature-sliced-frontend',
    title: 'معمارية Feature-Sliced Design (FSD) لتطبيقات الواجهات الكبرى',
    trackId: 'frontend',
    pattern: 'Feature-Sliced Design (FSD)',
    description: 'تنظيم شفرة الواجهة البرمجية في طبقات دقيقة موجهة للميزات (Features & Widgets) بدلاً من المجلدات التقنية التقليدية.',
    treeStructure: `src/
├── app/                     # تهيئة التطبيق، الموجهات العامة، والثيم والمزودات
│   ├── providers/
│   ├── routes/
│   └── styles/
├── pages/                   # صفحات التطبيق المكتملة (تركيب الـ Widgets)
│   ├── home/
│   ├── dashboard/
│   └── settings/
├── widgets/                 # تجميعات بصرية كبرى ومستقلة (Header, Sidebar, Feed)
│   ├── navbar/
│   └── product-grid/
├── features/                # تفاعلات مستخدم ذات قيمة تجارية (مثل تسجيل الدخول، إضافة للسلة)
│   ├── auth-by-email/
│   ├── add-to-cart/
│   └── search-products/
├── entities/                # كيانات الأعمال مع حالتها ومكوناتها البسيطة
│   ├── user/
│   ├── product/
│   └── order/
└── shared/                  # مكونات ومكتبات مساعدة قابلة لإعادة الاستخدام في كل مكان
    ├── ui/                  # Button, Modal, Input, Badge
    ├── api/                 # Axios/Fetch base client
    └── lib/                 # Formatting, helpers, hooks`,
    sampleCodeTitle: 'مثال تنظيم Feature مع شفرة نقية ومستقلة',
    sampleCodeLanguage: 'typescript',
    sampleCode: `// features/add-to-cart/ui/AddToCartButton.tsx
export function AddToCartButton({ productId }: { productId: string }) {
  const { addToCart, isAdding } = useCartActions();

  return (
    <button 
      onClick={() => addToCart(productId)}
      disabled={isAdding}
      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-medium"
    >
      {isAdding ? 'جارٍ الإضافة...' : 'إضافة إلى السلة'}
    </button>
  );
}`,
    benefits: [
      'تمنع التداخل العشوائي للاعتماديات (Strict Dependency Rule)',
      'تسهل توزيع العمل بين فرق متعددة دون تعارضات Git',
      'سرعة الوصول لأي ملف وتعديله دون الخوف من كسر ميزات أخرى'
    ]
  },
  {
    id: 't3-fullstack-architecture',
    title: 'معمارية التطوير الشامل فائق الأمان (T3 / End-to-End Type-Safety)',
    trackId: 'fullstack',
    pattern: 'Type-Safe Monorepo / Modular Stack',
    description: 'مشاركة الأنواع والتحقق بين الواجهة والخلفية بالكامل باستخدام TypeScript, Zod و tRPC أو Server Actions.',
    treeStructure: `├── apps/
│   └── web/                 # تطبيق الويب (Next.js / Angular)
│       ├── app/
│       └── components/
└── packages/
    ├── api/                 # تعريف الإجراءات والـ Routers والتحقق
    │   ├── src/routers/     # userRouter.ts, postRouter.ts
    │   └── src/root.ts
    ├── db/                  # مخطط وقاعدة البيانات وإدارتها
    │   ├── prisma/schema.prisma
    │   └── src/client.ts
    └── types-and-schemas/   # مخططات Zod المشتركة بين الجميع
        └── src/auth.schema.ts`,
    sampleCodeTitle: 'تكامل Zod و tRPC المشترك بين الواجهة والخلفية',
    sampleCodeLanguage: 'typescript',
    sampleCode: `// packages/types-and-schemas/src/auth.schema.ts
import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صالح'),
  password: z.string().min(8, 'كلمة المرور يجب أن لا تقل عن 8 أحرف')
});

export type LoginInput = z.infer<typeof LoginSchema>;`,
    benefits: [
      'اكتشاف أي خطأ في الـ API أو الحقول أثناء كتابة الكود مباشرة (Zero Runtime API Mismatches)',
      'إعادة استخدام مخططات التحقق (Zod Schemas) في استمارات العميل وتأكيد الخادم في آن واحد'
    ]
  },
  {
    id: 'offline-first-mobile',
    title: 'معمارية Offline-First للتطبيقات الذكية (Flutter / React Native)',
    trackId: 'mobile',
    pattern: 'Repository Pattern with Local Cache & Remote Sync',
    description: 'توفير تجربة مستخدم تعمل بكفاءة حتى بدون اتصال بالإنترنت مع مزامنة خلفية فورية عند عودة الشبكة.',
    treeStructure: `lib/
├── core/
│   ├── network/             # NetworkInfo & Connectivity Checker
│   ├── database/            # SQLite / Drift / Hive Local DB Setup
│   └── errors/              # Failure & Exception classes
├── features/
│   └── notes/
│       ├── data/
│       │   ├── datasources/ # NoteLocalDataSource.dart, NoteRemoteDataSource.dart
│       │   ├── models/      # NoteModel.dart (JSON Serialization)
│       │   └── repositories/# NoteRepositoryImpl.dart (Coordinates local + remote)
│       ├── domain/
│       │   ├── entities/    # Note.dart
│       │   ├── repositories/# INoteRepository.dart
│       │   └── usecases/    # GetNotesUseCase.dart, SyncNotesUseCase.dart
│       └── presentation/
│           ├── bloc/        # NoteBloc / State Management
│           └── pages/       # NotesScreen.dart`,
    sampleCodeTitle: 'نموذج Repository الذكي للتعامل مع عدم توفر الاتصال',
    sampleCodeLanguage: 'dart',
    sampleCode: `class NoteRepositoryImpl implements INoteRepository {
  final NoteRemoteDataSource remoteDataSource;
  final NoteLocalDataSource localDataSource;
  final NetworkInfo networkInfo;

  NoteRepositoryImpl({required this.remoteDataSource, required this.localDataSource, required this.networkInfo});

  @override
  Future<List<Note>> getNotes() async {
    if (await networkInfo.isConnected) {
      try {
        final remoteNotes = await remoteDataSource.fetchNotes();
        await localDataSource.cacheNotes(remoteNotes);
        return remoteNotes;
      } catch (_) {
        return await localDataSource.getCachedNotes();
      }
    } else {
      return await localDataSource.getCachedNotes();
    }
  }
}`,
    benefits: [
      'سرعة استجابة فورية للواجهة من الذاكرة المحلية (Instant 0ms UI loading)',
      'حفظ التعديلات في طابور محلي (Sync Queue) وإرسالها تلقائياً عند عودة الإنترنت'
    ]
  }
];

export const CHECKLIST_ITEMS: ChecklistItem[] = [
  // Security
  {
    id: 'sec-1',
    trackId: 'all',
    category: 'Security',
    title: 'حماية وحجب المفاتيح السرية (Environment Variables & Secrets)',
    description: 'التأكد من عدم رفع ملفات .env أو مفاتيح API Keys أو كلمات المرور في مستودعات Git واستخدام Secret Managers.',
    severity: 'critical'
  },
  {
    id: 'sec-2',
    trackId: 'all',
    category: 'Security',
    title: 'تطبيق ترويسات الأمان (Security Headers: CSP, HSTS, X-Frame-Options)',
    description: 'تكوين ترويسات HTTP الآمنة لمنع هجمات Clickjacking و XSS وفرض بروتوكول HTTPS الصارم.',
    severity: 'critical'
  },
  {
    id: 'sec-3',
    trackId: 'backend',
    category: 'Security',
    title: 'تحديد معدل الطلبات وحماية الـ Endpoints (Rate Limiting & Throttling)',
    description: 'تطبيق حدود استهلاك للواجهات البرمجية لحماية الخوادم من هجمات الحرمان من الخدمة (DDoS) والتخمين العشوائي.',
    severity: 'critical'
  },
  {
    id: 'sec-4',
    trackId: 'backend',
    category: 'Security',
    title: 'فحص وتعقيم المدخلات ضد هجمات SQL Injection & XSS',
    description: 'استخدام الاستعلامات المعلمة (Parameterized Queries) والـ ORMs واستخدام مكتبات التحقق الصارمة (Zod, Joi).',
    severity: 'critical'
  },
  // Performance
  {
    id: 'perf-1',
    trackId: 'frontend',
    category: 'Performance',
    title: 'ضغط الصور واستخدام صيغ الجيل الحديث (WebP, AVIF & Lazy Loading)',
    description: 'تحويل جميع الصور واستخدام سمة loading="lazy" وتحديد الأبعاد بدقة لمنع تغير المخطط البصري (CLS).',
    severity: 'recommended'
  },
  {
    id: 'perf-2',
    trackId: 'frontend',
    category: 'Performance',
    title: 'تقسيم الحزم البرمجية والتحميل الكسول (Code Splitting & Lazy Routing)',
    description: 'استخدام Dynamic Imports وتحميل المسارات والمكونات الثقيلة عند الحاجة فقط لتقليص الحجم الأولي.',
    severity: 'critical'
  },
  {
    id: 'perf-3',
    trackId: 'database',
    category: 'Performance',
    title: 'فهرسة أعمدة البحث الشائعة وتحليل الاستعلامات (Indexes & EXPLAIN)',
    description: 'إنشاء فهارس B-Tree للمفاتيح الخارجية وحقول البحث المتكرر والتأكد من عدم وجود Full Table Scans.',
    severity: 'critical'
  },
  {
    id: 'perf-4',
    trackId: 'backend',
    category: 'Performance',
    title: 'تفعيل التخزين المؤقت للبيانات الساخنة (Redis Caching & HTTP ETag)',
    description: 'تخزين نتائج الاستعلامات المتكررة ذات القراءة العالية في Redis لتقليل الحمل على قاعدة البيانات الرئيسية.',
    severity: 'recommended'
  },
  // SEO & A11y
  {
    id: 'seo-1',
    trackId: 'frontend',
    category: 'SEO & Accessibility',
    title: 'وسوم العناوين والوصف ومخططات البيانات (Semantic HTML & Schema.org)',
    description: 'استخدام عنصر h1 واحد في الصفحة ووسوم meta فريدة لكل صفحة وبيانات مهيكلة لمحركات البحث.',
    severity: 'recommended'
  },
  {
    id: 'seo-2',
    trackId: 'frontend',
    category: 'SEO & Accessibility',
    title: 'معايير الوصولية للمستخدمين ومطالعي الشاشات (ARIA & WCAG 2.1 AA)',
    description: 'توفير سمات alt للصور، تباين ألوان بنسبة 4.5:1 على الأقل، ودعم كامل للتنقل عبر لوحة المفاتيح (Tab focus).',
    severity: 'recommended'
  },
  // Quality & Testing
  {
    id: 'test-1',
    trackId: 'all',
    category: 'Quality & Testing',
    title: 'اختبارات الوحدة للمنطق الحرج (Unit Tests Coverage)',
    description: 'تغطية دوال الحسابات ومنطق الأعمال وتحويل البيانات باختبارات وحدة موثوقة وسريعة.',
    severity: 'recommended'
  },
  {
    id: 'test-2',
    trackId: 'all',
    category: 'Quality & Testing',
    title: 'سجل تتبع الأخطاء المركزي (Centralized Error Logging - Sentry / Datadog)',
    description: 'ربط نظام تتبع الأخطاء والانهيارات لتلقي إشعارات فورية عند حدوث أي استثناء لدى المستخدمين.',
    severity: 'critical'
  }
];

export const CHEATSHEET_COMMANDS: CheatSheetCommand[] = [
  // Git
  {
    command: 'git reset --soft HEAD~1',
    description: 'التراجع عن آخر Commit مع الاحتفاظ بجميع التعديلات في منطقة الـ Staging',
    tags: ['git', 'undo', 'commit'],
    trackIds: ['frontend', 'backend', 'fullstack', 'mobile', 'devops', 'ai', 'gamedev', 'security', 'database', 'iot'],
    category: 'Git & VCS'
  },
  {
    command: 'git commit --amend --no-edit',
    description: 'إضافة التعديلات الجديدة إلى آخر Commit دون تغيير رسالته',
    tags: ['git', 'commit', 'amend'],
    trackIds: ['frontend', 'backend', 'fullstack', 'mobile', 'devops', 'ai', 'gamedev', 'security', 'database', 'iot'],
    category: 'Git & VCS'
  },
  {
    command: 'git stash push -m "work-in-progress" && git stash pop',
    description: 'حفظ التعديلات المؤقتة جانباً في الـ Stash ثم استرجاعها لاحقاً',
    tags: ['git', 'stash'],
    trackIds: ['frontend', 'backend', 'fullstack', 'mobile', 'devops', 'ai', 'gamedev', 'security', 'database', 'iot'],
    category: 'Git & VCS'
  },
  // Docker
  {
    command: 'docker compose up -d --build --remove-orphans',
    description: 'إعادة بناء وتشغيل جميع الحاويات في الخلفية مع تنظيف الحاويات اليتيمة',
    tags: ['docker', 'compose', 'containers'],
    trackIds: ['backend', 'fullstack', 'devops', 'database', 'ai'],
    category: 'Docker & Containers'
  },
  {
    command: 'docker system prune -a --volumes -f',
    description: 'تنظيف وتفريغ الذاكرة من كافة الحاويات والصور والـ Volumes غير المستخدمة',
    tags: ['docker', 'cleanup', 'disk'],
    trackIds: ['backend', 'fullstack', 'devops', 'database', 'ai'],
    category: 'Docker & Containers'
  },
  {
    command: 'docker exec -it <container_name_or_id> /bin/sh',
    description: 'الدخول إلى سطر أوامر داخل حاوية تعمل حالياً',
    tags: ['docker', 'debug', 'shell'],
    trackIds: ['backend', 'fullstack', 'devops', 'database', 'ai'],
    category: 'Docker & Containers'
  },
  // Linux & Networking
  {
    command: 'sudo lsof -i :8080 -t | xargs kill -9',
    description: 'العثور على المعرف البرمجي (PID) لأي خدمة تعمل على المنفذ 8080 وإيقافها فورياً',
    tags: ['linux', 'port', 'kill', 'process'],
    trackIds: ['backend', 'fullstack', 'devops', 'security', 'database'],
    category: 'Linux & System'
  },
  {
    command: 'curl -I -v -X GET https://example.com/api/v1/health',
    description: 'فحص استجابة الـ HTTP وترويسات السيرفر وتفاصيل شهادة SSL بدقة',
    tags: ['curl', 'http', 'network', 'debug'],
    trackIds: ['backend', 'fullstack', 'devops', 'security'],
    category: 'Linux & System'
  },
  {
    command: 'tail -f -n 100 /var/log/nginx/error.log',
    description: 'متابعة سجل الأخطاء فورياً سطر بسطر لحظة حدوثها',
    tags: ['linux', 'logs', 'debug', 'nginx'],
    trackIds: ['backend', 'devops', 'fullstack'],
    category: 'Linux & System'
  },
  // PostgreSQL / Database
  {
    command: 'SELECT pid, query, state, age(clock_timestamp(), query_start) FROM pg_stat_activity WHERE state != \'idle\';',
    description: 'عرض جميع الاستعلامات الجارية حالياً في PostgreSQL والتي تستهلك موارد الخادم',
    tags: ['postgres', 'sql', 'performance', 'slow-query'],
    trackIds: ['database', 'backend', 'fullstack'],
    category: 'Databases & SQL'
  },
  {
    command: 'EXPLAIN (ANALYZE, BUFFERS, COSTS) SELECT * FROM users WHERE email = \'test@example.com\';',
    description: 'تحليل دقيق لخطة تنفيذ الاستعلام ومعرفة زمن القراءة من الذاكرة والقرص',
    tags: ['postgres', 'explain', 'query-plan', 'optimization'],
    trackIds: ['database', 'backend', 'fullstack'],
    category: 'Databases & SQL'
  },
  // Frontend / Node
  {
    command: 'npx ncu -u && npm install',
    description: 'تحديث جميع حزم package.json إلى أحدث الإصدارات المتوافقة دفعة واحدة',
    tags: ['npm', 'packages', 'upgrade', 'node'],
    trackIds: ['frontend', 'backend', 'fullstack'],
    category: 'Node & Packages'
  },
  {
    command: 'npx depcheck',
    description: 'فحص المشروع واكتشاف جميع المكتبات غير المستخدمة لتخفيف الحجم',
    tags: ['npm', 'cleanup', 'optimization'],
    trackIds: ['frontend', 'backend', 'fullstack'],
    category: 'Node & Packages'
  }
];

export const CURATED_RESOURCES: CuratedResource[] = [
  // Frontend
  {
    id: 'res-react-docs',
    title: 'React Official Documentation (react.dev)',
    trackId: 'frontend',
    category: 'Official Docs',
    description: 'التوثيق الرسمي الأحدث مع أمثلة تفاعلية وتطبيقات حديثة للـ Hooks والـ Server Components.',
    url: 'https://react.dev',
    badge: 'Official',
    starsOrPopularity: '230k+ ⭐'
  },
  {
    id: 'res-lucide-icons',
    title: 'Lucide Icons Library',
    trackId: 'frontend',
    category: 'Libraries & Frameworks',
    description: 'مكتبة أيقونات متجهة فائقة النقاء والخفة تدعم React, Vue, Angular ومشاريع الويب.',
    url: 'https://lucide.dev',
    badge: 'Icons',
    starsOrPopularity: '15k+ ⭐'
  },
  {
    id: 'res-free-apis',
    title: 'Public APIs Directory',
    trackId: 'frontend',
    category: 'Free APIs',
    description: 'دليل شامل لآلاف الواجهات البرمجية المجانية المفتوحة للتجربة وبناء المشاريع الاستعراضية.',
    url: 'https://github.com/public-apis/public-apis',
    badge: 'Free APIs',
    starsOrPopularity: '310k+ ⭐'
  },
  // Backend
  {
    id: 'res-fastapi',
    title: 'FastAPI Framework',
    trackId: 'backend',
    category: 'Libraries & Frameworks',
    description: 'إطار عمل Python فائق السرعة لبناء واجهات برمجية مع التحقق التلقائي وتوثيق Swagger مدمج.',
    url: 'https://fastapi.tiangolo.com',
    badge: 'Python',
    starsOrPopularity: '75k+ ⭐'
  },
  {
    id: 'res-system-design',
    title: 'System Design Primer',
    trackId: 'backend',
    category: 'Best Practices',
    description: 'المرجع الأشهر عالمياً لتعلم كيفية تصميم الأنظمة الضخمة القابلة للتوسع ومقابلات الـ Big Tech.',
    url: 'https://github.com/donnemartin/system-design-primer',
    badge: 'Architecture',
    starsOrPopularity: '280k+ ⭐'
  },
  // Fullstack
  {
    id: 'res-nextjs',
    title: 'Next.js by Vercel',
    trackId: 'fullstack',
    category: 'Libraries & Frameworks',
    description: 'إطار العمل الأشهر لإنشاء تطبيقات React مع الـ Server Actions و SSR والتخزين المؤقت الذكي.',
    url: 'https://nextjs.org',
    badge: 'Fullstack',
    starsOrPopularity: '125k+ ⭐'
  },
  // Mobile
  {
    id: 'res-flutter',
    title: 'Flutter Official Hub',
    trackId: 'mobile',
    category: 'Official Docs',
    description: 'أقوى إطار عمل لتطوير تطبيقات الجوال والويب والحاسوب من شفرة برمجية واحدة بواسطة Google.',
    url: 'https://flutter.dev',
    badge: 'Mobile SDK',
    starsOrPopularity: '165k+ ⭐'
  },
  // DevOps
  {
    id: 'res-docker-curriculum',
    title: 'Docker & Kubernetes Mastery Hub',
    trackId: 'devops',
    category: 'Best Practices',
    description: 'دليل تطبيقي شامل لإتقان الحاويات وإدارتها وأتمتة النشر عبر بيئات السحاب.',
    url: 'https://docker-curriculum.com',
    badge: 'DevOps',
    starsOrPopularity: 'Essential'
  },
  // AI
  {
    id: 'res-huggingface',
    title: 'Hugging Face Model Hub',
    trackId: 'ai',
    category: 'Tools & Platforms',
    description: 'المنصة العالمية الأولى للنماذج مفتوحة المصدر (Open Source LLMs, Vision, Audio) ومجموعات البيانات.',
    url: 'https://huggingface.co',
    badge: 'AI Platform',
    starsOrPopularity: 'Top 1'
  },
  // Security
  {
    id: 'res-owasp-top-10',
    title: 'OWASP Top 10 Security Risks',
    trackId: 'security',
    category: 'Official Docs',
    description: 'المعيار العالمي الأكثر ثقة لأخطر 10 ثغرات أمنية في تطبيقات الويب وكيفية الوقاية منها.',
    url: 'https://owasp.org/www-project-top-ten/',
    badge: 'Security',
    starsOrPopularity: 'Standard'
  },
  // Databases
  {
    id: 'res-use-the-index-luke',
    title: 'Use The Index, Luke! (SQL Indexing Guide)',
    trackId: 'database',
    category: 'Best Practices',
    description: 'أروع دليل مجاني لفهم كيفية عمل فهارس قواعد البيانات من الداخل وتسريع الاستعلامات.',
    url: 'https://use-the-index-luke.com',
    badge: 'SQL Guide',
    starsOrPopularity: 'Gold Standard'
  },
  // IoT
  {
    id: 'res-random-nerd-tutorials',
    title: 'ESP32 & IoT Hardware Projects Hub',
    trackId: 'iot',
    category: 'Best Practices',
    description: 'مئات المشاريع العملية والموثقة خطوة بخطوة للـ ESP32 والحساسات وبروتوكولات MQTT والـ Wi-Fi.',
    url: 'https://randomnerdtutorials.com',
    badge: 'Hardware',
    starsOrPopularity: 'Top IoT Resource'
  }
];

export const AI_PROMPT_TEMPLATES: AIPromptTemplate[] = [
  {
    id: 'prompt-code-review',
    title: 'مراجعة أمنية وهيكلية شاملة للكود (Senior Code Review)',
    trackId: 'all',
    category: 'Code Review',
    description: 'أمر ذكاء اصطناعي احترافي لفحص الكود كمهندس خبير (Senior Staff) واكتشاف الثغرات الأمنية ومشاكل الأداء والتعقيد الزمني.',
    prompt: `أنت مهندس برمجيات خبير (Senior Staff Engineer). قم بمراجعة الكود التالي بدقة متناهية:
1. **الأمان (Security)**: هل توجد أي ثغرات مثل XSS, SQLi, Memory Leaks, أو سوء تعامل مع البيانات الحساسة؟
2. **الأداء والتعقيد (Performance & Big-O)**: ما هو التعقيد الزمني والمكاني؟ وكيف يمكن تحسينه؟
3. **النظافة والمعمارية (Clean Code)**: هل تتبع أسس SOLID و DRY؟ وما هي أسماء المتغيرات والدوال التي تحتاج لتحسين؟
4. **اقتراح الكود النهائي المحسن**: أعد كتابة الكود بعد تطبيق جميع التحسينات مع شرح مبسط لكل تغيير.

الكود المراد مراجعته:
\`\`\`{{language}}
{{code}}
\`\`\``,
    variables: ['language', 'code']
  },
  {
    id: 'prompt-unit-tests',
    title: 'توليد اختبارات شاملة مع الحالات الحدية (Unit Tests Generator)',
    trackId: 'all',
    category: 'Unit Tests',
    description: 'توليد اختبارات وحدة كاملة تغطي المسار الطبيعي (Happy Path)، الحالات الحدية (Edge Cases)، ومعالجة الأخطاء.',
    prompt: `قم بكتابة اختبارات وحدة (Unit Tests) شاملة للكود المرفق باستخدام إطار العمل {{framework}} (مثل Jest, Vitest, PyTest, JUnit):
المتطلبات:
1. تغطية المسار الرئيسي (Happy Path).
2. تغطية الحالات الحدية (Edge Cases: null, undefined, مصفوفات فارغة, أرقام سالبة, نصوص فائقة الطول).
3. تغطية سيناريوهات الأخطاء والاستثناءات والتأكد من رمي الخطأ المناسب.
4. استخدام أسماء واضحة للاختبارات بصيغة \`it should ... when ...\`.
5. استخدام Mocking لأي اتصال بقاعدة بيانات أو استدعاء شبكي خارجي.

الكود:
\`\`\`{{language}}
{{code}}
\`\`\``,
    variables: ['framework', 'language', 'code']
  },
  {
    id: 'prompt-sql-optimizer',
    title: 'تحسين استعلامات قواعد البيانات الضخمة (SQL Query Optimizer)',
    trackId: 'database',
    category: 'Refactoring',
    description: 'تحليل استعلام SQL بطيء واقتراح الفهارس المناسبة وإعادة صياغة الـ JOINs والـ Subqueries لأعلى سرعة.',
    prompt: `أنت خبير في تحسين أداء قواعد البيانات (Database Performance Tuning).
لدي الاستعلام التالي الذي يعاني من بطء في بيئة الإنتاج:

نوع قاعدة البيانات: {{db_type}} (PostgreSQL / MySQL / etc)
حجم الجدول التقريبي: {{table_size}} صفوف
الاستعلام الحالي:
\`\`\`sql
{{sql_query}}
\`\`\`

المطلوب:
1. تحليل نقاط الاختناق المتوقعة (Bottlenecks) في الاستعلام الحالي.
2. إعادة كتابة الاستعلام بأعلى كفاءة ممكنة.
3. اقتراح الفهارس (Indexes) الدقيقة الواجب إنشاؤها على الجداول لدعم هذا الاستعلام.`,
    variables: ['db_type', 'table_size', 'sql_query']
  },
  {
    id: 'prompt-architecture-design',
    title: 'تصميم معمارية نظام ومواصفات تقنية (System Architecture Blueprint)',
    trackId: 'backend',
    category: 'Architecture',
    description: 'توليد وثيقة تصميم تقني معمارية متكاملة لخدمة أو ميزة جديدة مع مخطط تدفق البيانات واختيار التقنيات.',
    prompt: `أنت مهندس معماري للأنظمة الموزعة (Principal Solutions Architect).
المطلوب تصميم معمارية تقنية لمشروع: "{{project_goal}}"

يرجى تقديم وثيقة تصميم تقني (RFC / Design Doc) تغطي:
1. **المعمارية العامة ومخطط المكونات (Component Overview)**.
2. **اختيار التقنيات والمسوغات (Tech Stack Choices & Justifications)**.
3. **تصميم قاعدة البيانات ونموذج البيانات الأساسي (Data Model & Schema)**.
4. **استراتيجية التخزين المؤقت والاتصال اللحظي (Caching & Realtime)**.
5. **التعامل مع الإخفاقات والتوسع (Scalability & Failure Handling)**.`,
    variables: ['project_goal']
  }
];
