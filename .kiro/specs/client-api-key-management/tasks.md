# Implementation Plan

## Backend Implementation

- [ ] 1. Create shared type definitions for client API keys
  - Write TypeScript interfaces for ClientApiKey, ClientApiKeyUsageStats, and API request/response types
  - Add client API key error constants to shared constants
  - Update shared types index exports
  - _Requirements: 1.1, 1.3, 2.1, 2.3, 3.2, 7.1, 7.2, 7.3_

- [ ] 2. Implement client API key storage layer
  - Create ClientApiKeyRepository class with CRUD operations using KV storage
  - Implement storage key generation functions following existing patterns
  - Add KV storage methods for API key lookup and usage stats
  - Write unit tests for repository methods
  - _Requirements: 2.1, 2.2, 2.3, 8.1_

- [ ] 3. Implement client API key business service
  - Create ClientApiKeyService with secure key generation using crypto.getRandomValues()
  - Implement key lifecycle management (create, update, disable, delete)
  - Add usage statistics tracking and aggregation methods
  - Write unit tests for service logic
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.3, 5.1, 5.2, 6.1, 6.2, 8.1, 8.2_

- [ ] 4. Create authentication service for client keys
  - Implement ClientApiKeyAuthService for key validation
  - Add methods to verify key status and update usage tracking
  - Integrate with existing error handling patterns
  - Write unit tests for authentication flows
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 8.4_

- [ ] 5. Implement client API key middleware
  - Create authentication middleware that validates client API keys from request headers
  - Add support for multiple authentication methods (admin + client keys)
  - Implement request context enhancement with client identity
  - Write integration tests for middleware
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 6. Create admin routes for client key management
  - Implement GET /api/admin/client-keys route for listing all keys
  - Add POST /api/admin/client-keys route for creating new keys
  - Create GET /api/admin/client-keys/:keyId route for key details
  - Implement PUT /api/admin/client-keys/:keyId route for updating keys
  - Add DELETE /api/admin/client-keys/:keyId route for key deletion
  - _Requirements: 1.1, 1.2, 2.1, 3.1, 4.1, 4.4, 5.1, 5.4, 6.1, 6.4_

- [ ] 7. Implement usage statistics endpoints
  - Create GET /api/admin/client-keys/:keyId/stats route for detailed statistics
  - Add aggregation logic for daily and hourly usage data
  - Implement real-time stats updates in key usage tracking
  - Write integration tests for statistics endpoints
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 8. Integrate client authentication into proxy routes
  - Modify existing Claude proxy routes to include client key authentication
  - Add client key verification before processing proxy requests
  - Update proxy request handling to track usage per client key
  - Write integration tests for authenticated proxy requests
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 8.1_

## Frontend Implementation

- [ ] 9. Create client API key management page
  - Build /admin/client-keys main page component with key listing
  - Implement ClientKeyList.vue component with masked key display
  - Add empty state handling and loading states
  - Create responsive layout following existing admin page patterns
  - _Requirements: 2.1, 2.2, 2.4_

- [ ] 10. Implement key creation functionality
  - Create CreateKeyModal.vue component for generating new API keys
  - Add form validation for description input with length limits
  - Implement secure key display with copy-to-clipboard functionality
  - Add success/error notification handling
  - _Requirements: 1.1, 1.2, 1.4, 6.3_

- [ ] 11. Build key detail page and management actions
  - Create /admin/client-keys/[keyId] detail page component
  - Implement KeyActionsDropdown.vue for enable/disable/delete operations
  - Add confirmation dialogs for destructive actions
  - Build inline editing for key descriptions
  - _Requirements: 3.1, 3.3, 4.1, 4.4, 5.1, 5.2, 6.1, 6.2_

- [ ] 12. Create usage statistics visualization
  - Build KeyStatsChart.vue component using a charting library
  - Implement daily and hourly usage charts with time range selection
  - Add usage metrics display (total requests, last used time)
  - Create real-time or periodic stats refresh functionality
  - _Requirements: 3.2, 3.4, 8.1, 8.2, 8.3_

- [ ] 13. Integrate API client methods
  - Add client API key management methods to admin API client
  - Implement error handling for API calls with user-friendly messages
  - Add TypeScript type safety for all API interactions
  - Create composables for key management operations
  - _Requirements: 1.2, 2.1, 3.1, 4.4, 5.4, 6.4_

## Testing and Integration

- [ ] 14. Write comprehensive integration tests
  - Create test suite for complete CRUD operations flow
  - Add tests for client authentication scenarios (valid, invalid, disabled keys)
  - Implement usage statistics accuracy tests
  - Write edge case tests for concurrent operations and error conditions
  - _Requirements: 1.1, 2.1, 4.1, 7.1, 7.2, 7.3, 8.1_

- [ ] 15. Add navigation and route integration
  - Update admin navigation menu to include client keys management
  - Add proper route guards and authentication checks
  - Integrate with existing admin layout and styling
  - Test navigation flow and page transitions
  - _Requirements: 2.1_