import React from 'react';
import { registerFeature } from '../../app/routeRegistry';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import TaskBoardPage from './TaskBoardPage';

const taskRoutes = [
  {
    path: '/tasks',
    element: (
      <ProtectedRoute>
        <TaskBoardPage />
      </ProtectedRoute>
    ),
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
