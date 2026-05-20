import { NavLink } from '@mantine/core';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavItem {
  link: string;
  label: string;
  icon: React.ElementType;
  permission?: string | null;
}

interface NavbarProps {
  items: NavItem[];
}

export default function Navbar({ items }: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = items.map((item) => (
    <NavLink
      key={item.link}
      label={item.label}
      leftSection={<item.icon size={16} />}
      active={location.pathname === item.link}
      onClick={() => navigate(item.link)}
      variant="subtle"
    />
  ));

  return <div>{navItems}</div>;
}