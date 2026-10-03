import React from 'react';
import { registerFeature } from '../../app/routeRegistry';
import TaskBoardPage from './TaskBoardPage';

const taskRoutes = [
  {
    path: '/tasks',
    element: <TaskBoardPage />,
  },
];

registerFeature({
  id: 'tasks',
  name: 'Volunteer Tasks',
  routes: taskRoutes,
  navItems: [
    {
      path: '/tasks',
      label: 'Volunteer Board',
    },
  ],
});

export default taskRoutes;
