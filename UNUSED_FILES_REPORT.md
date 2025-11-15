# 🔍 Unused Files Analysis Report

**Date:** 2025-11-15
**Total Files:** 236
**Used:** 24
**Potentially Unused:** 212

---

## ⚠️ Potentially Unused Files

**Warning:** These files appear to be unused, but verify before deleting:
- May be used dynamically
- May be future features
- May be referenced in non-TS files

### `components/admin/`

- `BankAccountDialog.tsx`
- `ConfirmDialog.tsx`
- `CreateOrderDialog.tsx`
- `CryptoWalletDialog.tsx`
- `DataTable.tsx`
- `DataTableAdvanced.tsx`
- `EditableCells.tsx`
- `KycFormDataDisplay.tsx`
- `LegalDocumentEditor.tsx`
- `NotificationBell.tsx`
- `OrderDetailsSheet.tsx`
- `OrderKanban.tsx`
- `OrderTransitionDialog.tsx`
- `PSPProviderDialog.tsx`
- `PasskeyLoginButton.tsx`
- `PasskeyManagement.tsx`
- `PasswordTotpLogin.tsx`
- `PaymentMethodDialog.tsx`
- `QuickStats.tsx`
- `SecuritySettingsTab.tsx`
- `StepUpMfaDialog.tsx`

### `components/admin/dashboard/`

- `ActionCenter.tsx`
- `PerformanceIndicators.tsx`

### `components/blocks/editor-00/`

- `editor.tsx`
- `nodes.ts`
- `plugins.tsx`
- `toolbar-plugin.tsx`

### `components/crm/`

- `DependencyAlert.tsx`
- `QuickNav.tsx`
- `RelatedEntityBadge.tsx`
- `ResourceFormModal.tsx`
- `ResourceManager.tsx`
- `ResourceSheet.tsx`

### `components/editor/`

- `RichTextEditor.tsx`

### `components/editor/editor-ui/`

- `content-editable.tsx`

### `components/editor/themes/`

- `editor-theme.ts`

### `components/email/`

- `EmailEditor.tsx`

### `components/features/`

- `AddWalletDialog.tsx`
- `BrandLogo.tsx`
- `ClientOrderWidget.tsx`
- `CurrencyIcon.tsx`
- `DeleteWalletDialog.tsx`
- `KycAlert.tsx`
- `KycStatusBadge.tsx`
- `OrderStatusBadge.tsx`
- `TwoFactorAuth.tsx`

### `components/forms/`

- `DynamicKycForm.tsx`
- `FileUpload.tsx`

### `components/invoice/`

- `InvoiceDocument.tsx`

### `components/kyc/`

- `DocumentUploader.tsx`
- `KycConsentScreen.tsx`
- `KycField.tsx`
- `KycFormStep.tsx`
- `KycFormWizard.tsx`
- `KycStatusCard.tsx`
- `SumsubWebSDK.tsx`

### `components/kyc/hooks/`

- `useKycFields.ts`
- `useKycForm.ts`

### `components/layouts/`

- `AdminFooter.tsx`
- `AdminLayoutClient.tsx`
- `AdminSidebar.tsx`
- `ClientHeader.tsx`
- `Footer.tsx`
- `Header.tsx`
- `UserMenu.tsx`

### `components/orders/`

- `DownloadInvoiceButton.tsx`

### `components/reports/`

- `UserReportDocument.tsx`

### `components/shared/`

- `Combobox.tsx`
- `DateRangePicker.tsx`
- `StatusBadge.tsx`

### `components/ui/`

- `accordion.tsx`
- `alert-dialog.tsx`
- `alert.tsx`
- `aspect-ratio.tsx`
- `avatar.tsx`
- `badge.tsx`
- `breadcrumb.tsx`
- `calendar.tsx`
- `card.tsx`
- `checkbox.tsx`
- `collapsible.tsx`
- `command.tsx`
- `context-menu.tsx`
- `copy-button.tsx`
- `country-dropdown.tsx`
- `date-picker.tsx`
- `dialog.tsx`
- `form.tsx`
- `hover-card.tsx`
- `index.ts`
- `input-otp.tsx`
- `input.tsx`
- `label.tsx`
- `navigation-menu.tsx`
- `pagination.tsx`
- `password-generator.tsx`
- `phone-input.tsx`
- `progress.tsx`
- `radio-group.tsx`
- `resizable.tsx`
- `scroll-area.tsx`
- `select.tsx`
- `separator.tsx`
- `sheet.tsx`
- `slider.tsx`
- `switch.tsx`
- `table.tsx`
- `tabs.tsx`
- `textarea.tsx`
- `tooltip.tsx`

### `components/ui/shadcn-io/color-picker/`

- `index.tsx`

### `components/ui/shadcn-io/qr-code/`

- `index.tsx`
- `server.tsx`

### `hooks/`

- `useAdminPermissions.ts`
- `useAdminSession.ts`
- `useBranding.ts`

### `lib/`

- `auth-utils.ts`
- `config.ts`
- `constants.ts`
- `env.ts`
- `formatters.ts`
- `openapi-generator.ts`
- `openapi-routes.ts`
- `session-revocation-check.ts`
- `utils.ts`
- `webauthn-config.ts`

### `lib/actions/`

- `admin-auth.ts`

### `lib/email-templates/`

- `base-layout.ts`
- `components.ts`
- `presets.ts`

### `lib/features/`

- `admin-auth-features.ts`

### `lib/integrations/`

- `IntegrationFactory.ts`
- `IntegrationRegistry.ts`
- `index.ts`
- `types.ts`

### `lib/integrations/categories/`

- `IBlockchainProvider.ts`
- `IEmailProvider.ts`
- `IKycProvider.ts`
- `IPaymentProvider.ts`
- `IRateProvider.ts`
- `IRatesProvider.ts`

### `lib/integrations/providers/blockchain/`

- `TatumAdapter.ts`

### `lib/integrations/providers/email/`

- `ResendAdapter.ts`

### `lib/integrations/providers/kyc/`

- `KycaidAdapter.ts`
- `SumsubAdapter.ts`

### `lib/integrations/providers/rates/`

- `CoinGeckoAdapter.ts`
- `KrakenAdapter.ts`

### `lib/kyc/`

- `conditionalLogic.ts`
- `config.ts`

### `lib/middleware/`

- `admin-auth.ts`
- `api-auth.ts`
- `step-up-mfa.ts`

### `lib/services/`

- `action-center.service.ts`
- `admin-audit-log.service.ts`
- `admin-session.service.ts`
- `api-key.service.ts`
- `audit.service.ts`
- `blockchain-provider.service.ts`
- `cache.service.ts`
- `coingecko.ts`
- `document-upload.service.ts`
- `email-data-builders.ts`
- `email-notification.service.ts`
- `email-template.service.ts`
- `email.ts`
- `encryption.service.ts`
- `event-emitter.service.ts`
- `integration-config.service.ts`
- `integration-management.service.ts`
- `invoice-pdf.service.ts`
- `kyc-form.service.ts`
- `kyc.service.ts`
- `kycaid.ts`
- `notification.service.ts`
- `order-limit.service.ts`
- `order-status-sync.service.ts`
- `passkey.service.ts`
- `payment-method.service.ts`
- `payment.service.ts`
- `permission.service.ts`
- `rate-management.service.ts`
- `rate-provider.service.ts`
- `security-audit.service.ts`
- `step-up-mfa.service.ts`
- `system-log.service.ts`
- `totp.service.ts`
- `user-activity.service.ts`
- `user-audit-log.service.ts`
- `user-report-pdf.service.ts`
- `wallet-validator.service.ts`

### `lib/storage/`

- `blob.service.ts`

### `lib/utils/`

- `country-codes.ts`
- `country-utils.ts`
- `email-urls.ts`
- `export-utils.ts`
- `export.ts`
- `lexical-to-html.ts`
- `order-calculations.ts`
- `password-generator.ts`

### `lib/validations/`

- `admin-order.ts`
- `api-key.ts`
- `customer.ts`
- `kyc-admin.ts`
- `kyc.ts`
- `legal-document.ts`
- `order.ts`
- `payment-method.ts`
- `trading-pair.ts`
- `wallet.ts`

### `lib/validators/`

- `wallet-address.ts`

### `types/`

- `next-auth.d.ts`
- `phone-country.d.ts`

---

## 📋 Recommendations

1. **Review each file** - May have dynamic imports
2. **Check git history** - May be work in progress
3. **Test after removal** - Verify nothing breaks
4. **Keep backup** - Use git to revert if needed

