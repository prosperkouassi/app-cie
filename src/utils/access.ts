// Until purchases are validated, no persisted value or route parameter grants access.
export type Access = { premium: boolean; discoveryComplete: boolean };
export function accessRights(development: boolean, testEnabled: boolean, discoveryComplete: boolean): Access {
  return { premium: development && testEnabled === true, discoveryComplete };
}
export function canEditSetup(access: Access): boolean { return access.premium || !access.discoveryComplete; }
export function canUsePersonalSimulation(access: Access): boolean { return access.premium; }
export function canManageScenarios(access: Access): boolean { return access.premium; }
export function canUpdateBalance(access: Access): boolean { return access.premium; }
