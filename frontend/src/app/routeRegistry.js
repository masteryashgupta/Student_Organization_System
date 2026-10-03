// Central Route Registry
// Each feature module registers its routes and navigation links here.

const registeredFeatures = [];

export function registerFeature(featureConfig) {
  if (!featureConfig || !featureConfig.id) return;
  const existingIdx = registeredFeatures.findIndex((f) => f.id === featureConfig.id);
  if (existingIdx !== -1) {
    registeredFeatures[existingIdx] = featureConfig;
  } else {
    registeredFeatures.push(featureConfig);
  }
}

export function getRegisteredNavItems(userRole = 'public') {
  const isOfficer = ['admin', 'leader'].includes(userRole);
  const isMember = ['admin', 'leader', 'member'].includes(userRole);

  const seenPaths = new Set();
  const seenLabels = new Set();
  const result = [];

  registeredFeatures.forEach((feat) => {
    if (feat.navItems) {
      feat.navItems.forEach((item) => {
        let allowed = false;
        if (!item.roles || item.roles.includes(userRole)) {
          allowed = true;
        } else if (item.officerOnly && isOfficer) {
          allowed = true;
        } else if (item.memberOnly && isMember) {
          allowed = true;
        }

        if (allowed && item.path && item.label) {
          if (!seenPaths.has(item.path) && !seenLabels.has(item.label)) {
            seenPaths.add(item.path);
            seenLabels.add(item.label);
            result.push(item);
          }
        }
      });
    }
  });

  return result;
}

export function getRegisteredRoutes() {
  const routeMap = new Map();
  registeredFeatures.forEach((feat) => {
    if (feat.routes) {
      feat.routes.forEach((route) => {
        if (route.path && !routeMap.has(route.path)) {
          routeMap.set(route.path, route);
        }
      });
    }
  });
  return Array.from(routeMap.values());
}
