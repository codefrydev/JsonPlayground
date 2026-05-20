import JsonPlayground from '@/components/JsonPlayground';
import DesktopOnly from '@/components/DesktopOnly';

const JsonPage = () => {
  return (
    <DesktopOnly>
      <JsonPlayground />
    </DesktopOnly>
  );
};

export default JsonPage;
