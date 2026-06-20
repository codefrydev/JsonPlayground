import DesktopOnly from '@/components/DesktopOnly';
import JsonGenerator from '@/components/JsonGenerator';

const JsonGeneratorPage = () => {
  return (
    <DesktopOnly>
      <JsonGenerator />
    </DesktopOnly>
  );
};

export default JsonGeneratorPage;
