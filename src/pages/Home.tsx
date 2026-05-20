import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FileJson, FileCode, FileSpreadsheet, Key, Shield, ArrowRightLeft, ArrowLeftRight } from 'lucide-react';
import DesktopOnly from '@/components/DesktopOnly';

const Home = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const shareParam = searchParams.get('s');

  useEffect(() => {
    if (shareParam) {
      navigate(`/json?s=${encodeURIComponent(shareParam)}`, { replace: true });
    }
  }, [shareParam, navigate]);

  if (shareParam) {
    return null;
  }

  const cardBase =
    'group block rounded-xl border border-border bg-card/80 backdrop-blur-sm p-6 h-full text-left transition-all duration-200 hover:border-primary/40 hover:bg-card hover:shadow-lg hover:shadow-primary/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background';

  return (
    <DesktopOnly>
      <div className="min-h-screen bg-background flex flex-col bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 md:py-24">
          <div className="w-full max-w-4xl space-y-14">
            <header className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground">
                No sign-up · Runs in the browser
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                JSON Explorer
              </h1>
              <p className="mx-auto max-w-xl text-lg text-muted-foreground">
                Explore, edit, and query JSON or XAML. Tree view, JavaScript execution, and instant conversion between formats.
              </p>
            </header>

            <section className="space-y-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Playgrounds
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <Link to="/json" className={cardBase}>
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20 transition-colors group-hover:bg-primary/25">
                      <FileJson className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        JSON Playground
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Paste JSON, explore the tree, run JavaScript, and convert to XAML.
                      </p>
                      <span className="inline-flex items-center text-sm font-medium text-primary">
                        Open playground
                      </span>
                    </div>
                  </div>
                </Link>

                <Link to="/xaml" className={cardBase}>
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20 transition-colors group-hover:bg-primary/25">
                      <FileCode className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        XAML Playground
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Edit XAML, view the tree, run JavaScript, and convert to JSON.
                      </p>
                      <span className="inline-flex items-center text-sm font-medium text-primary">
                        Open playground
                      </span>
                    </div>
                  </div>
                </Link>

                <Link to="/yaml" className={cardBase}>
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20 transition-colors group-hover:bg-primary/25">
                      <FileCode className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        YAML Playground
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Edit YAML and view the parsed tree. Convert to JSON.
                      </p>
                      <span className="inline-flex items-center text-sm font-medium text-primary">
                        Open playground
                      </span>
                    </div>
                  </div>
                </Link>

                <Link to="/csv" className={cardBase}>
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20 transition-colors group-hover:bg-primary/25">
                      <FileSpreadsheet className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        CSV Playground
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Edit CSV, see table preview, and convert to JSON.
                      </p>
                      <span className="inline-flex items-center text-sm font-medium text-primary">
                        Open playground
                      </span>
                    </div>
                  </div>
                </Link>

                <Link to="/toml" className={cardBase}>
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20 transition-colors group-hover:bg-primary/25">
                      <FileCode className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        TOML Playground
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Edit TOML and view the parsed tree. Convert to JSON.
                      </p>
                      <span className="inline-flex items-center text-sm font-medium text-primary">
                        Open playground
                      </span>
                    </div>
                  </div>
                </Link>

                <Link to="/env" className={cardBase}>
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20 transition-colors group-hover:bg-primary/25">
                      <Key className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        .env Playground
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Edit .env key=value and see JSON preview.
                      </p>
                      <span className="inline-flex items-center text-sm font-medium text-primary">
                        Open playground
                      </span>
                    </div>
                  </div>
                </Link>

                <Link to="/jwt" className={cardBase}>
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20 transition-colors group-hover:bg-primary/25">
                      <Shield className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        JWT Playground
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Decode a JWT or encode header and payload into a signed token.
                      </p>
                      <span className="inline-flex items-center text-sm font-medium text-primary">
                        Open playground
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            </section>

            <section className="space-y-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Converters
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <Link to="/xaml-to-json" className={cardBase}>
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20 transition-colors group-hover:bg-primary/25">
                      <ArrowRightLeft className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        XAML to JSON
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Paste XAML in one panel, see JSON output in the other.
                      </p>
                      <span className="inline-flex items-center text-sm font-medium text-primary">
                        Open converter
                      </span>
                    </div>
                  </div>
                </Link>

                <Link to="/json-to-xaml" className={cardBase}>
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20 transition-colors group-hover:bg-primary/25">
                      <ArrowLeftRight className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        JSON to XAML
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Paste JSON in one panel, see XAML output in the other.
                      </p>
                      <span className="inline-flex items-center text-sm font-medium text-primary">
                        Open converter
                      </span>
                    </div>
                  </div>
                </Link>

                <Link to="/yaml-to-json" className={cardBase}>
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20 transition-colors group-hover:bg-primary/25">
                      <ArrowRightLeft className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        YAML to JSON
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Paste YAML in one panel, see JSON output in the other.
                      </p>
                      <span className="inline-flex items-center text-sm font-medium text-primary">
                        Open converter
                      </span>
                    </div>
                  </div>
                </Link>

                <Link to="/json-to-yaml" className={cardBase}>
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20 transition-colors group-hover:bg-primary/25">
                      <ArrowLeftRight className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        JSON to YAML
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Paste JSON in one panel, see YAML output in the other.
                      </p>
                      <span className="inline-flex items-center text-sm font-medium text-primary">
                        Open converter
                      </span>
                    </div>
                  </div>
                </Link>

                <Link to="/csv-to-json" className={cardBase}>
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20 transition-colors group-hover:bg-primary/25">
                      <ArrowRightLeft className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        CSV to JSON
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Paste CSV in one panel, see JSON array in the other.
                      </p>
                      <span className="inline-flex items-center text-sm font-medium text-primary">
                        Open converter
                      </span>
                    </div>
                  </div>
                </Link>

                <Link to="/json-to-csv" className={cardBase}>
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20 transition-colors group-hover:bg-primary/25">
                      <ArrowLeftRight className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        JSON to CSV
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Paste JSON array of objects, see CSV in the other panel.
                      </p>
                      <span className="inline-flex items-center text-sm font-medium text-primary">
                        Open converter
                      </span>
                    </div>
                  </div>
                </Link>

                <Link to="/toml-to-json" className={cardBase}>
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20 transition-colors group-hover:bg-primary/25">
                      <ArrowRightLeft className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        TOML to JSON
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Paste TOML in one panel, see JSON in the other.
                      </p>
                      <span className="inline-flex items-center text-sm font-medium text-primary">
                        Open converter
                      </span>
                    </div>
                  </div>
                </Link>

                <Link to="/json-to-toml" className={cardBase}>
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20 transition-colors group-hover:bg-primary/25">
                      <ArrowLeftRight className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        JSON to TOML
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Paste JSON object in one panel, see TOML in the other.
                      </p>
                      <span className="inline-flex items-center text-sm font-medium text-primary">
                        Open converter
                      </span>
                    </div>
                  </div>
                </Link>

                <Link to="/xml-to-json" className={cardBase}>
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20 transition-colors group-hover:bg-primary/25">
                      <ArrowRightLeft className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        XML to JSON
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Paste XML in one panel, see JSON tree in the other.
                      </p>
                      <span className="inline-flex items-center text-sm font-medium text-primary">
                        Open converter
                      </span>
                    </div>
                  </div>
                </Link>

                <Link to="/json-to-xml" className={cardBase}>
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20 transition-colors group-hover:bg-primary/25">
                      <ArrowLeftRight className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        JSON to XML
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Paste JSON in one panel, see XML in the other.
                      </p>
                      <span className="inline-flex items-center text-sm font-medium text-primary">
                        Open converter
                      </span>
                    </div>
                  </div>
                </Link>

                <Link to="/env-to-json" className={cardBase}>
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20 transition-colors group-hover:bg-primary/25">
                      <ArrowRightLeft className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        .env to JSON
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Paste .env in one panel, see JSON in the other.
                      </p>
                      <span className="inline-flex items-center text-sm font-medium text-primary">
                        Open converter
                      </span>
                    </div>
                  </div>
                </Link>

                <Link to="/json-to-env" className={cardBase}>
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20 transition-colors group-hover:bg-primary/25">
                      <ArrowLeftRight className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        JSON to .env
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Paste JSON object in one panel, see .env in the other.
                      </p>
                      <span className="inline-flex items-center text-sm font-medium text-primary">
                        Open converter
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </DesktopOnly>
  );
};

export default Home;
