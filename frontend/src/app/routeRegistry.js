// Central Route Registry
// Each feature module registers its routes and navigation links here.

const registeredFeatures = [];

export function registerFeature(featureConfig) {
  // featureConfig: { id, name, navItems: [...], routes: [...] }
  registeredFeatures.push(featureConfig);
}

export function getRegisteredNavItems(userRole = 'public') {
  const isOfficer = ['admin', 'leader'].includes(userRole);
  const isMember = ['admin', 'leader', 'member'].includes(userRole);

  const allItems = [];
  registeredFeatures.forEach((feat) => {
    if (feat.navItems) {
      feat.navItems.forEach((item) => {
        if (!item.roles || item.roles.includes(userRole)) {
          allItems.push(item);
        } else if (item.officerOnly && isOfficer) {
          allItems.push(item);
        } else if (item.memberOnly && isMember) {
          allItems.push(item);
        }
      });
    }
  });

  return allItems;
}

export function getRegisteredRoutes() {
  const allRoutes = [];
  registeredFeatures.forEach((feat) => {
    if (feat.routes) {
      allRoutes.push(...feat.routes);
    }
  });
  return allRoutes;
}
