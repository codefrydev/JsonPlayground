import XamlPlayground from '@/components/XamlPlayground';
import DesktopOnly from '@/components/DesktopOnly';

const XamlPage: React.FC = () => {
  return (
    <DesktopOnly>
      <XamlPlayground />
    </DesktopOnly>
  );
};

export default XamlPage;
