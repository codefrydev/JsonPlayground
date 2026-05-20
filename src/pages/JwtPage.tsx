import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Home, Copy, RotateCcw, Sparkles } from 'lucide-react';
import CsvEditor from '@/components/CsvEditor';
import JwtEditor from '@/components/JwtEditor';
import JsonEditor from '@/components/JsonEditor';
import ClaimsTable from '@/components/ClaimsTable';
import DesktopOnly from '@/components/DesktopOnly';
import {
  decodeJwt,
  verifyJwt,
  encodeJwt,
  generateExampleJwt,
  EXAMPLE_SECRET,
} from '@/lib/jwt';
import { useDebounce } from '@/hooks/useDebounce';

const DEFAULT_HEADER = `{
  "alg": "HS256",
  "typ": "JWT"
}`;

const DEFAULT_PAYLOAD = `{
  "sub": "1234567890",
  "name": "John Doe",
  "admin": true,
  "iat": 1516239022
}`;

const copyToClipboard = async (text: string) => {
  await navigator.clipboard.writeText(text);
};

const JwtPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'decoder' | 'encoder'>('decoder');

  const [jwtInput, setJwtInput] = useState('');
  const [verifySecret, setVerifySecret] = useState('');
  const [verifyResult, setVerifyResult] = useState<{ ok: boolean; error?: string } | null>(null);

  const [headerJson, setHeaderJson] = useState(DEFAULT_HEADER);
  const [payloadJson, setPayloadJson] = useState(DEFAULT_PAYLOAD);
  const [encodeSecret, setEncodeSecret] = useState('');
  const [encodedJwt, setEncodedJwt] = useState('');
  const [encodeError, setEncodeError] = useState<string | null>(null);

  const decodeResult = useMemo(() => decodeJwt(jwtInput), [jwtInput]);

  const runVerify = useCallback(async () => {
    if (!jwtInput.trim() || !verifySecret.trim()) {
      setVerifyResult(null);
      return;
    }
    const result = await verifyJwt(jwtInput, verifySecret);
    setVerifyResult(result.ok ? { ok: true } : { ok: false, error: result.error });
  }, [jwtInput, verifySecret]);

  const debouncedVerify = useDebounce(runVerify, 300);
  useEffect(() => {
    debouncedVerify();
  }, [jwtInput, verifySecret, debouncedVerify]);

  const runEncode = useCallback(async () => {
    if (!encodeSecret.trim()) {
      setEncodedJwt('');
      setEncodeError(null);
      return;
    }
    let header: Record<string, unknown>;
    let payload: Record<string, unknown>;
    try {
      header = JSON.parse(headerJson) as Record<string, unknown>;
      payload = JSON.parse(payloadJson) as Record<string, unknown>;
    } catch (e) {
      setEncodedJwt('');
      setEncodeError(e instanceof Error ? e.message : 'Invalid JSON');
      return;
    }
    const result = await encodeJwt(header, payload, encodeSecret, 'HS256');
    if (result.ok) {
      setEncodedJwt(result.jwt);
      setEncodeError(null);
    } else {
      setEncodedJwt('');
      setEncodeError(result.error);
    }
  }, [headerJson, payloadJson, encodeSecret]);

  const debouncedEncode = useDebounce(runEncode, 400);
  useEffect(() => {
    debouncedEncode();
  }, [headerJson, payloadJson, encodeSecret, debouncedEncode]);

  const handleGenerateExample = useCallback(async () => {
    try {
      const jwt = await generateExampleJwt();
      setJwtInput(jwt);
      setVerifySecret(EXAMPLE_SECRET);
      setActiveTab('decoder');
    } catch {
      // ignore
    }
  }, []);

  const headerString = useMemo(
    () =>
      decodeResult.ok
        ? JSON.stringify(decodeResult.header, null, 2)
        : '',
    [decodeResult]
  );
  const payloadString = useMemo(
    () =>
      decodeResult.ok
        ? JSON.stringify(decodeResult.payload, null, 2)
        : '',
    [decodeResult]
  );

  return (
    <DesktopOnly>
      <div className="h-screen flex flex-col bg-background">
        <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">JWT Playground</h1>
            <Link
              to="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Home className="w-4 h-4" />
              Home
            </Link>
          </div>
          <Button variant="outline" size="sm" onClick={handleGenerateExample}>
            <Sparkles className="w-4 h-4 mr-1" />
            Generate example
          </Button>
        </header>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'decoder' | 'encoder')} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-3 shrink-0">
            <TabsList>
              <TabsTrigger value="decoder">JWT Decoder</TabsTrigger>
              <TabsTrigger value="encoder">JWT Encoder</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="decoder" className="flex-1 flex flex-col min-h-0 mt-0 p-4 data-[state=inactive]:hidden">
            <div className="flex-1 flex flex-col min-h-0">
              <p className="text-sm text-muted-foreground mb-3 shrink-0">
                Paste a JWT below that you&apos;d like to decode, validate, and verify.
              </p>
              <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0 rounded-lg border border-border overflow-hidden">
                <ResizablePanel defaultSize={50} minSize={20} className="flex flex-col min-w-0 min-h-0">
                <div className="px-3 py-2 border-b border-border bg-muted/50 shrink-0">
                  <div className="text-sm font-medium text-foreground uppercase tracking-wide">Encoded value</div>
                  <div className="text-xs text-muted-foreground mt-0.5">JSON Web Token (JWT)</div>
                  {decodeResult.ok && (
                    <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-green-600 dark:text-green-400">
                      <span>Valid JWT</span>
                      {verifySecret.trim() && verifyResult?.ok && <span>Signature Verified</span>}
                    </div>
                  )}
                  {!decodeResult.ok && jwtInput.trim() && (
                    <div className="mt-1.5 text-xs text-destructive">{decodeResult.error}</div>
                  )}
                </div>
                <div className="flex-1 min-h-0 flex flex-col">
                  <JwtEditor
                    value={jwtInput}
                    onChange={setJwtInput}
                    placeholder="Paste JWT here (eyJ...)"
                  />
                </div>
                <div className="px-3 py-2 border-t border-border flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(jwtInput)}>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setJwtInput('')}>
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                </div>
              </ResizablePanel>
                <ResizableHandle className="bg-border" />
                <ResizablePanel defaultSize={50} minSize={20} className="flex flex-col min-w-0 min-h-0 overflow-hidden">
                  <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4 decoder-right-panel">
                  <section>
                    <div className="text-sm font-medium text-foreground uppercase tracking-wide mb-2">Decoded header</div>
                    <Tabs defaultValue="json" className="w-full">
                      <TabsList className="h-8">
                        <TabsTrigger value="json">JSON</TabsTrigger>
                        <TabsTrigger value="table">Claims table</TabsTrigger>
                      </TabsList>
                      <TabsContent value="json" className="mt-2">
                        <div className="relative rounded-md border border-border overflow-hidden h-[200px] flex flex-col">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1.5 right-1.5 z-10 h-7 w-7 rounded text-muted-foreground hover:text-foreground"
                            onClick={() => copyToClipboard(headerString)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <JsonEditor
                            value={headerString}
                            onChange={() => {}}
                            readOnly
                          />
                        </div>
                      </TabsContent>
                      <TabsContent value="table" className="mt-2">
                        <div className="relative rounded-md border border-border p-2">
                          {decodeResult.ok ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-1.5 right-1.5 h-7 w-7 rounded text-muted-foreground hover:text-foreground"
                                onClick={() => copyToClipboard(headerString)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <ClaimsTable data={decodeResult.header} />
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">No header</p>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </section>

                  <section>
                    <div className="text-sm font-medium text-foreground uppercase tracking-wide mb-2">Decoded payload</div>
                    <Tabs defaultValue="json" className="w-full">
                      <TabsList className="h-8">
                        <TabsTrigger value="json">JSON</TabsTrigger>
                        <TabsTrigger value="table">Claims table</TabsTrigger>
                      </TabsList>
                      <TabsContent value="json" className="mt-2">
                        <div className="relative rounded-md border border-border overflow-hidden h-[200px] flex flex-col">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1.5 right-1.5 z-10 h-7 w-7 rounded text-muted-foreground hover:text-foreground"
                            onClick={() => copyToClipboard(payloadString)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <JsonEditor
                            value={payloadString}
                            onChange={() => {}}
                            readOnly
                          />
                        </div>
                      </TabsContent>
                      <TabsContent value="table" className="mt-2">
                        <div className="relative rounded-md border border-border p-2">
                          {decodeResult.ok ? (
                            <>
                              <Button variant="ghost" size="icon" className="absolute top-1.5 right-1.5 h-7 w-7 rounded text-muted-foreground hover:text-foreground" onClick={() => copyToClipboard(payloadString)}>
                                <Copy className="h-4 w-4" />
                              </Button>
                              <ClaimsTable data={decodeResult.payload} />
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">No payload</p>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </section>

                  <section>
                    <div className="text-sm font-medium text-foreground uppercase tracking-wide mb-2">
                      JWT signature verification (optional)
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">Enter the secret used to sign the JWT below:</p>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Secret</label>
                      <Input
                        type="password"
                        placeholder="Secret"
                        value={verifySecret}
                        onChange={(e) => setVerifySecret(e.target.value)}
                        className="font-mono text-sm"
                      />
                      {verifySecret.trim() && verifyResult !== null && (
                        <div className={verifyResult.ok ? 'text-xs text-green-600 dark:text-green-400' : 'text-xs text-destructive'}>
                          {verifyResult.ok ? 'Valid secret' : verifyResult.error}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button variant="outline" size="sm" onClick={() => copyToClipboard(verifySecret)}>
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setVerifySecret('')}>
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Clear
                      </Button>
                    </div>
                  </section>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </TabsContent>

          <TabsContent value="encoder" className="flex-1 flex flex-col min-h-0 mt-0 p-4 data-[state=inactive]:hidden">
            <div className="flex-1 flex flex-col min-h-0">
              <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0 rounded-lg border border-border overflow-hidden">
                <ResizablePanel defaultSize={50} minSize={20} className="flex flex-col min-w-0 min-h-0">
                <div className="px-3 py-2 border-b border-border bg-muted/50 text-sm font-medium shrink-0">Header (JSON)</div>
                <div className="flex-1 min-h-0 flex flex-col">
                  <JsonEditor value={headerJson} onChange={setHeaderJson} placeholder="Header JSON..." />
                </div>
                <div className="px-3 py-2 border-b border-border bg-muted/50 text-sm font-medium shrink-0">Payload (JSON)</div>
                <div className="flex-1 min-h-0 flex flex-col">
                  <JsonEditor value={payloadJson} onChange={setPayloadJson} placeholder="Payload JSON..." />
                </div>
                <div className="px-3 py-2 border-b border-border bg-muted/50 shrink-0 space-y-2">
                  <label className="text-sm font-medium block">Secret</label>
                  <Input
                    type="password"
                    placeholder="Secret to sign the token"
                    value={encodeSecret}
                    onChange={(e) => setEncodeSecret(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </ResizablePanel>
                <ResizableHandle className="bg-border" />
                <ResizablePanel defaultSize={50} minSize={20} className="flex flex-col min-w-0 min-h-0">
                  <div className="px-3 py-2 border-b border-border bg-muted/50 text-sm font-medium shrink-0">Generated JWT</div>
                <div className="flex-1 min-h-0 flex flex-col p-3">
                  {!encodeSecret.trim() ? (
                    <p className="text-sm text-muted-foreground">Enter a secret to sign the token.</p>
                  ) : encodeError ? (
                    <p className="text-sm text-destructive">{encodeError}</p>
                  ) : (
                    <>
                      <div className="flex-1 min-h-[200px] rounded-md border border-border overflow-hidden flex flex-col">
                        <JwtEditor value={encodedJwt} onChange={() => {}} readOnly placeholder="JWT output..." />
                      </div>
                      <div className="flex gap-2 mt-2 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(encodedJwt)}>
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setEncodedJwt('')}>
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Clear
                        </Button>
                      </div>
                    </>
                  )}
                </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DesktopOnly>
  );
};

export default JwtPage;
