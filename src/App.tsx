import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import DashboardPage from './pages/DashboardPage';
import PersonsPage from './pages/PersonsPage';
import PersonDetailPage from './pages/PersonDetailPage';
import RelationshipsPage from './pages/RelationshipsPage';
import VehiclesPage from './pages/VehiclesPage';
import GroupsPage from './pages/GroupsPage';
import ImportAssistantPage from './pages/ImportAssistantPage';
import SmartAssignmentPage from './pages/SmartAssignmentPage';
import GraphPage from './pages/GraphPage';
import SearchPage from './pages/SearchPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return <Routes><Route element={<AppShell />}><Route path="/" element={<DashboardPage />} /><Route path="/persons" element={<PersonsPage />} /><Route path="/persons/:id" element={<PersonDetailPage />} /><Route path="/relationships" element={<RelationshipsPage />} /><Route path="/vehicles" element={<VehiclesPage />} /><Route path="/groups" element={<GroupsPage />} /><Route path="/import" element={<ImportAssistantPage />} /><Route path="/smart-assignment" element={<SmartAssignmentPage />} /><Route path="/graph" element={<GraphPage />} /><Route path="/search" element={<SearchPage />} /><Route path="/settings" element={<SettingsPage />} /></Route></Routes>;
}
