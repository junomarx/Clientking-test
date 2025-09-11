/**
 * Migration Barrel Module
 * Exports all migration functions for the separate migration runner
 */

// Import all existing migration functions
import addSecondSignatureColumns from "./add-second-signature";
import { addPricingPlanColumn } from "./add-pricing-plan-column";
import { addCompanySloganVatColumns } from "./add-company-slogan-vat-columns";
import "./add-creation-month-column";
import { addShopIdColumn } from "./add-shop-id-column";
import { addFeatureOverridesColumn } from "./add-feature-overrides-column";
import { addPackageTables } from "./add-package-tables";
import { addDeviceIssuesFields } from "./add-device-issues-fields";
import { addHiddenDeviceTypesTable } from "./add-hidden-device-types-table";
import { addBrandIdToModels } from "./add-brand-id-to-models";
import { addPrintTemplatesTable } from "./add-print-templates-table";
import { addErrorCatalogEntriesTable } from "./add-error-catalog-entries-table";
import { addGameconsoleToErrorCatalog } from "./add-gameconsole-to-error-catalog";
import { addEmailTemplateTypeColumn } from "./add-email-template-type";
import { syncEmailTemplates } from "./sync-email-templates";
import { addSupportAccessTable } from "./add-support-access-table";
import { addSupportRequestStatus } from "./add-support-request-status";

// Export all migration functions for the runner
export {
  addSecondSignatureColumns,
  addPricingPlanColumn,
  addCompanySloganVatColumns,
  addShopIdColumn,
  addFeatureOverridesColumn,
  addPackageTables,
  addDeviceIssuesFields,
  addHiddenDeviceTypesTable,
  addBrandIdToModels,
  addPrintTemplatesTable,
  addErrorCatalogEntriesTable,
  addGameconsoleToErrorCatalog,
  addEmailTemplateTypeColumn,
  addSupportAccessTable,
  addSupportRequestStatus,
  syncEmailTemplates
};