# Virtual IBAN - Диаграммы и визуализация

## 1. Архитектура системы

```mermaid
graph TB
    subgraph "Frontend Layer"
        A1[Admin Panel<br/>/admin/virtual-iban]
        A2[Client Panel<br/>/client/virtual-iban]
    end
    
    subgraph "API Layer"
        B1[Admin API<br/>/api/admin/virtual-iban/*]
        B2[Client API<br/>/api/client/virtual-iban/*]
        B3[Webhook API<br/>/api/webhooks/bcb/virtual-iban]
    end
    
    subgraph "Service Layer"
        C1[VirtualIbanService]
    end
    
    subgraph "Integration Layer"
        D1[IVirtualIbanProvider<br/>Interface]
        D2[BCBGroupAdapter]
        D3[CurrencyCloudAdapter]
        D4[ModulrAdapter]
    end
    
    subgraph "Database"
        E1[(VirtualIbanAccount)]
        E2[(VirtualIbanTransaction)]
        E3[(PayIn)]
        E4[(Order)]
    end
    
    subgraph "External Services"
        F1[BCB Group API]
        F2[Currency Cloud API]
        F3[Modulr API]
    end
    
    A1 --> B1
    A2 --> B2
    F1 --> B3
    
    B1 --> C1
    B2 --> C1
    B3 --> C1
    
    C1 --> D1
    D1 --> D2
    D1 --> D3
    D1 --> D4
    
    D2 --> F1
    D3 --> F2
    D4 --> F3
    
    C1 --> E1
    C1 --> E2
    C1 --> E3
    C1 --> E4
```

## 2. User Flow - Создание Virtual IBAN

```mermaid
sequenceDiagram
    participant U as User
    participant P as Platform
    participant S as VirtualIbanService
    participant BCB as BCB Group API
    participant DB as Database
    
    U->>P: Register + Complete KYC
    activate P
    
    P->>S: createVirtualIban(userId, currency, country)
    activate S
    
    S->>BCB: POST /v4/accounts<br/>{user details, currency}
    activate BCB
    
    BCB-->>BCB: Create Bank Account<br/>Generate IBAN
    
    BCB-->>S: {accountId, iban, bic, bankName}
    deactivate BCB
    
    S->>DB: Save VirtualIbanAccount
    activate DB
    DB-->>S: Account saved
    deactivate DB
    
    S-->>P: {iban, bic, bankName, status}
    deactivate S
    
    P-->>U: Display Virtual IBAN<br/>+ Payment Instructions
    deactivate P
    
    Note over U: User can now use this IBAN<br/>for all future deposits
```

## 3. Payment Flow - Webhook и Auto-reconciliation

```mermaid
sequenceDiagram
    participant Bank as User's Bank
    participant BCB as BCB Group
    participant WH as Webhook Endpoint
    participant S as VirtualIbanService
    participant DB as Database
    participant N as NotificationService
    participant U as User
    
    Bank->>BCB: SEPA Transfer<br/>€1,000 to IBAN
    
    BCB->>BCB: Process Payment<br/>Credit Account
    
    BCB->>WH: POST /api/webhooks/bcb/virtual-iban<br/>{accountId, amount, sender}
    activate WH
    
    WH->>WH: Verify Signature
    
    WH->>S: handleIncomingPayment(webhookData)
    activate S
    
    S->>DB: Find VirtualIbanAccount<br/>by accountId
    activate DB
    DB-->>S: {userId, iban, currency}
    deactivate DB
    
    S->>DB: Create VirtualIbanTransaction
    activate DB
    DB-->>S: Transaction created
    deactivate DB
    
    S->>S: Match with Order<br/>(by reference, amount, userId)
    
    alt Order Found
        S->>DB: Update Order status<br/>→ PAYMENT_RECEIVED
        S->>DB: Create/Update PayIn
    else No Order
        S->>DB: Create Order automatically<br/>(if auto-create enabled)
    end
    
    S-->>WH: {success: true}
    deactivate S
    deactivate WH
    
    S->>N: Send Email Notification
    activate N
    N->>U: "Payment Received: €1,000"
    deactivate N
    
    Note over U: Order status updated<br/>automatically
```

## 4. Data Model Relationships

```mermaid
erDiagram
    User ||--o{ VirtualIbanAccount : "has"
    VirtualIbanAccount ||--o{ VirtualIbanTransaction : "contains"
    VirtualIbanTransaction }o--|| Order : "links to"
    VirtualIbanTransaction }o--|| PayIn : "links to"
    
    User {
        string id PK
        string email
        string role
    }
    
    VirtualIbanAccount {
        string id PK
        string userId FK
        string providerId
        string providerAccountId
        string iban UK
        string bic
        string bankName
        string currency
        string country
        enum status
        float balance
        datetime createdAt
    }
    
    VirtualIbanTransaction {
        string id PK
        string virtualIbanId FK
        string providerTxId UK
        enum type
        float amount
        string currency
        string senderName
        string senderIban
        string reference
        enum status
        string orderId FK
        string payInId FK
        datetime processedAt
    }
    
    Order {
        string id PK
        string userId FK
        float fiatAmount
        enum status
    }
    
    PayIn {
        string id PK
        string orderId FK
        string virtualIbanId FK
        float amount
        enum status
    }
```

## 5. Provider Strategy Pattern

```mermaid
classDiagram
    class IVirtualIbanProvider {
        <<interface>>
        +createAccount(request) VirtualIbanAccount
        +getAccountDetails(accountId) VirtualIbanAccount
        +getTransactions(accountId) Transaction[]
        +getBalance(accountId) Balance
        +suspendAccount(accountId) Result
        +reactivateAccount(accountId) Result
        +closeAccount(accountId) Result
        +processWebhook(payload) WebhookData
    }
    
    class BCBGroupAdapter {
        -baseUrl: string
        -token: string
        +createAccount(request)
        +getTransactions(accountId)
        +processWebhook(payload)
    }
    
    class CurrencyCloudAdapter {
        -apiKey: string
        +createAccount(request)
        +getTransactions(accountId)
        +processWebhook(payload)
    }
    
    class ModulrAdapter {
        -apiKey: string
        +createAccount(request)
        +getTransactions(accountId)
        +processWebhook(payload)
    }
    
    class VirtualIbanService {
        -provider: IVirtualIbanProvider
        +createVirtualIban(userId)
        +handleIncomingPayment(data)
        +reconcilePayment(txId, orderId)
    }
    
    IVirtualIbanProvider <|.. BCBGroupAdapter
    IVirtualIbanProvider <|.. CurrencyCloudAdapter
    IVirtualIbanProvider <|.. ModulrAdapter
    VirtualIbanService --> IVirtualIbanProvider
```

## 6. State Machine - Virtual IBAN Status

```mermaid
stateDiagram-v2
    [*] --> PENDING: User registers
    PENDING --> ACTIVE: vIBAN created successfully
    PENDING --> FAILED: Creation failed
    
    ACTIVE --> SUSPENDED: Admin suspends<br/>or KYC expired
    SUSPENDED --> ACTIVE: Reactivate
    SUSPENDED --> CLOSED: Close account
    
    ACTIVE --> CLOSED: User deleted<br/>or manual close
    
    CLOSED --> [*]
    FAILED --> [*]
    
    note right of ACTIVE
        Can receive payments
        Webhook processing enabled
    end note
    
    note right of SUSPENDED
        Cannot receive payments
        Webhooks ignored
    end note
    
    note right of CLOSED
        Permanent state
        No operations allowed
    end note
```

## 7. Transaction Status Flow

```mermaid
stateDiagram-v2
    [*] --> PENDING: Webhook received
    
    PENDING --> COMPLETED: Payment confirmed<br/>+ Order matched
    PENDING --> FAILED: Payment rejected<br/>or timeout
    
    COMPLETED --> REFUNDED: Refund initiated
    REFUNDED --> [*]
    
    COMPLETED --> [*]
    FAILED --> [*]
    
    note right of PENDING
        Transaction created
        Awaiting reconciliation
    end note
    
    note right of COMPLETED
        Matched with Order
        PayIn created
        User notified
    end note
```

## 8. Reconciliation Algorithm

```mermaid
flowchart TD
    A[Webhook: New Transaction] --> B{Find vIBAN Account}
    B -->|Not Found| C[Log Error + Alert Admin]
    B -->|Found| D[Create VirtualIbanTransaction]
    
    D --> E{Transaction Type?}
    E -->|DEBIT| F[Skip Reconciliation]
    E -->|CREDIT| G[Start Reconciliation]
    
    G --> H{Match by Reference?}
    H -->|Yes| I[Extract Order ID<br/>from reference]
    I --> J{Order Exists?}
    J -->|Yes| K[Link Transaction → Order]
    J -->|No| L[Create New Order]
    
    H -->|No| M{Match by Amount + User?}
    M -->|Yes| N[Find Recent Order<br/>same amount + userId]
    N --> O{Order Found?}
    O -->|Yes| K
    O -->|No| L
    
    M -->|No| P{Auto-create Order?}
    P -->|Yes| L
    P -->|No| Q[Mark as Unreconciled<br/>+ Notify Admin]
    
    K --> R[Update Order Status<br/>→ PAYMENT_RECEIVED]
    L --> R
    
    R --> S[Create/Update PayIn]
    S --> T[Send Email Notification]
    T --> U[Success ✓]
    
    C --> V[Failed]
    F --> V
    Q --> V
```

## 9. Admin Panel UI Flow

```mermaid
flowchart LR
    A[/Admin Login/] --> B[Virtual IBANs List]
    
    B --> C{Action?}
    
    C -->|View| D[Account Details]
    D --> D1[Show IBAN, Balance]
    D --> D2[Transaction History]
    D --> D3[User Info]
    
    C -->|Create| E[Create vIBAN Form]
    E --> E1[Select User]
    E --> E2[Select Currency]
    E --> E3[Submit]
    E3 --> F{Success?}
    F -->|Yes| B
    F -->|No| G[Show Error]
    
    C -->|Suspend| H[Confirm Suspend]
    H --> B
    
    C -->|Reconcile| I[Reconciliation Tool]
    I --> I1[Unreconciled Txs]
    I --> I2[Match with Order]
    I --> I3[Manual Link]
    I3 --> B
```

## 10. Client Panel UI Flow

```mermaid
flowchart LR
    A[/Client Login/] --> B[My Virtual IBANs]
    
    B --> C{Has vIBAN?}
    
    C -->|Yes| D[Show vIBAN Card]
    D --> D1[Display IBAN, BIC]
    D --> D2[Copy IBAN Button]
    D --> D3[Download PDF Instructions]
    D --> D4[View Transactions]
    
    C -->|No| E{Can Request?}
    E -->|Yes| F[Request vIBAN Form]
    F --> F1[Select Currency]
    F --> F2[Submit Request]
    F2 --> G{Approved?}
    G -->|Yes| H[vIBAN Created]
    H --> D
    G -->|No| I[Show Reason]
    
    E -->|No| J[Contact Support Message]
    
    D4 --> K[Transaction History Page]
    K --> K1[Filter by Date]
    K --> K2[Export CSV]
```

---

## Легенда

### Цвета (если поддерживаются)

- 🟢 **Зелёный** - Success states
- 🔴 **Красный** - Error states
- 🟡 **Жёлтый** - Pending/Waiting states
- 🔵 **Синий** - Active processing states

### Обозначения

- `→` - Sync call
- `⇢` - Async call / Event
- `◆` - Decision point
- `□` - Process/Action
- `○` - State
- `⬢` - External service

---

**Эти диаграммы можно использовать в:**
- Technical documentation
- Team presentations
- Client demos
- Code reviews
- Onboarding new developers





