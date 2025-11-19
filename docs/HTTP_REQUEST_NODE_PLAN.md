# HTTP Request Node - n8n-style Implementation Plan

## 🎯 Goal
Create a professional HTTP Request node matching n8n's functionality and UX.

## 📋 n8n HTTP Request Node Features

### 1. **Request Configuration**
- ✅ Method: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
- ✅ URL: Dynamic with expression support
- 🔄 **Query Parameters**: Key-value pairs with expression support
- 🔄 **Headers**: Key-value pairs with expression support
- 🔄 **Body**: Multiple formats
  - None
  - JSON
  - Form Data (application/x-www-form-urlencoded)
  - Form Data (multipart/form-data)
  - Raw/Custom
  - Binary Data

### 2. **Authentication** 🔐
- ✅ None
- ✅ Basic Auth
- ✅ Bearer Token
- ✅ API Key (Header/Query)
- 🔄 OAuth1
- 🔄 OAuth2
- 🔄 Digest Auth
- 🔄 AWS Signature
- 🔄 Custom Auth

### 3. **Response Handling** 📥
- 🔄 Response Format: JSON, String, Binary
- 🔄 Success Status Codes: Custom list (e.g., 200-299, 404)
- 🔄 Error Handling:
  - Continue on fail
  - Retry on fail
  - Custom error messages
- 🔄 Response Property: Extract specific field (e.g., `data.results`)
- 🔄 Full Response: Include headers, status code

### 4. **Advanced Options** ⚙️
- ✅ Timeout (ms)
- 🔄 Follow Redirects: Yes/No
- 🔄 Max Redirects: Number
- 🔄 Ignore SSL Issues: Yes/No
- 🔄 Proxy: URL
- 🔄 Batching: Send multiple items
- 🔄 Pagination: Auto-pagination support

### 5. **Pre/Post Request** 🔄
- 🔄 Pre-Request Script: JavaScript code before request
- 🔄 Post-Response Script: Transform response data

### 6. **Credentials Management** 🔑
- 🔄 Predefined Credentials: Select from stored credentials
- 🔄 Credential Types:
  - Generic (Header/Query)
  - OAuth2
  - API Key
  - Custom

### 7. **Testing & Debugging** 🧪
- 🔄 Test Request: Execute and see response
- 🔄 Request Preview: Show final URL, headers, body
- 🔄 Response Preview: Show status, headers, body
- 🔄 Execution History: Past requests and responses

## 🏗️ Implementation Phases

### Phase 1: Enhanced Request Configuration ✅
**Files to update:**
- `src/lib/validations/http-request.ts` - Extended schema
- `src/app/(admin)/admin/workflows/[id]/_components/PropertiesPanel.tsx` - New form sections
- `src/app/(admin)/admin/workflows/[id]/_components/nodes/HttpRequestNode.tsx` - Display updates

**Tasks:**
1. Add Query Parameters builder (key-value pairs)
2. Add Headers builder (key-value pairs)
3. Add Body Type selector (None/JSON/Form/Raw)
4. Add Body content editor based on type
5. Expression support for all fields

### Phase 2: Response Handling & Testing ✅
**Files to create/update:**
- `src/lib/services/http-auth.service.ts` - Auth handlers
- `src/components/workflows/CredentialSelector.tsx` - Credential picker
- Extend `http-request.ts` validation

**Tasks:**
1. OAuth2 flow implementation
2. Digest Auth implementation
3. AWS Signature V4 implementation
4. Credential storage in database
5. Credential sharing between workflows

### Phase 3: Response Handling 🔄
**Files to update:**
- `src/lib/services/workflow-executor.service.ts` - Response processing
- PropertiesPanel - Response config section

**Tasks:**
1. Response format selection
2. Success status codes configuration
3. Error handling options
4. Response data extraction
5. Full response mode (headers + body + status)

### Phase 4: Advanced Options 🔄
**Tasks:**
1. Proxy configuration
2. SSL options
3. Redirect handling
4. Retry logic with exponential backoff
5. Request batching

### Phase 5: Testing & Debugging 🔄
**Files to create:**
- `src/app/(admin)/admin/workflows/[id]/_components/HttpRequestTester.tsx`
- `src/app/api/admin/workflows/[id]/test-http/route.ts`

**Tasks:**
1. Test panel for live execution
2. Request preview (show final URL + headers + body)
3. Response preview with syntax highlighting
4. Save/load test scenarios

## 📐 UI/UX Design (n8n-style)

### Form Layout:
```
┌─────────────────────────────────────────┐
│ 🌐 HTTP Request                         │
├─────────────────────────────────────────┤
│                                         │
│ ┌─ Request ─────────────────────────┐  │
│ │ Method: [GET ▼]  URL: [________]  │  │
│ │                                    │  │
│ │ Query Parameters:                 │  │
│ │   key1: value1           [x]      │  │
│ │   key2: {{ $node.value }} [x]     │  │
│ │   [+ Add Parameter]               │  │
│ │                                    │  │
│ │ Headers:                          │  │
│ │   Content-Type: application/json  │  │
│ │   [+ Add Header]                  │  │
│ └────────────────────────────────────┘  │
│                                         │
│ ┌─ Body ────────────────────────────┐  │
│ │ Body Type: [JSON ▼]               │  │
│ │ ┌──────────────────────────────┐  │  │
│ │ │ {                            │  │  │
│ │ │   "key": "{{ $node.value }}" │  │  │
│ │ │ }                            │  │  │
│ │ └──────────────────────────────┘  │  │
│ └────────────────────────────────────┘  │
│                                         │
│ ┌─ Authentication ──────────────────┐  │
│ │ Auth: [Bearer Token ▼]            │  │
│ │ Token: [________________]         │  │
│ │ Or: [Select Credential ▼]        │  │
│ └────────────────────────────────────┘  │
│                                         │
│ ┌─ Response ────────────────────────┐  │
│ │ ☑ Full Response                   │  │
│ │ Response Property: [data.results] │  │
│ │ Nest Under: [response]            │  │
│ └────────────────────────────────────┘  │
│                                         │
│ ┌─ Options ─────────────────────────┐  │
│ │ Timeout: [30000] ms               │  │
│ │ ☑ Follow Redirects                │  │
│ │ ☐ Ignore SSL Issues               │  │
│ │ [+ Show More Options]             │  │
│ └────────────────────────────────────┘  │
│                                         │
│ [Test Request] [Save]                  │
└─────────────────────────────────────────┘
```

## 🔧 Technical Implementation

### 1. Enhanced Config Schema
```typescript
interface HttpRequestConfig {
  // Basic
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  url: string;
  
  // Parameters
  queryParameters: Array<{ key: string; value: string }>;
  headers: Array<{ key: string; value: string }>;
  
  // Body
  bodyType: 'NONE' | 'JSON' | 'FORM_URLENCODED' | 'FORM_DATA' | 'RAW' | 'BINARY';
  body: string;
  
  // Auth
  authType: 'NONE' | 'BASIC' | 'BEARER' | 'API_KEY' | 'OAUTH1' | 'OAUTH2' | 'DIGEST' | 'AWS';
  authConfig: Record<string, any>;
  credentialId?: string;
  
  // Response
  responseFormat: 'JSON' | 'STRING' | 'BINARY';
  fullResponse: boolean;
  responseProperty?: string;
  successStatusCodes: number[];
  
  // Options
  timeout: number;
  followRedirects: boolean;
  maxRedirects: number;
  ignoreSSL: boolean;
  proxy?: string;
  retryOnFailure: boolean;
  retryAttempts: number;
  retryDelay: number;
}
```

### 2. Key-Value Pair Builder Component
```typescript
// src/components/workflows/KeyValuePairBuilder.tsx
<KeyValuePairBuilder
  items={queryParameters}
  onChange={(items) => updateConfig('queryParameters', items)}
  placeholder={{ key: 'param_name', value: 'param_value' }}
  expressionSupport={true}
/>
```

### 3. Body Type Editor
```typescript
// Dynamic editor based on bodyType
{bodyType === 'JSON' && <JsonEditor />}
{bodyType === 'FORM_URLENCODED' && <KeyValuePairBuilder />}
{bodyType === 'FORM_DATA' && <MultipartFormBuilder />}
{bodyType === 'RAW' && <TextEditor />}
```

## 📊 Success Criteria

- ✅ All n8n HTTP Request features implemented
- ✅ Intuitive UI matching n8n style
- ✅ Full expression support ({{ }} syntax)
- ✅ Live testing capability
- ✅ Request/Response preview
- ✅ Credential management
- ✅ Error handling and retries
- ✅ Professional documentation

## 🚀 Next Steps

1. Start with Phase 1: Query Parameters + Headers builders
2. Enhance Body configuration with multiple types
3. Add live testing panel
4. Implement advanced auth methods
5. Add response handling options
6. Polish UI/UX to match n8n

---

**Estimate**: ~3-4 days for full implementation
**Priority**: High - Core workflow functionality

