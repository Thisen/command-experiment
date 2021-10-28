import React, {
  createContext,
  useContext,
  useMemo,
  useRef,
  ReactHTML,
  useEffect,
} from "react";

const KeyCommandContext = createContext({});

interface KeyboardCommand {
  key: string;
  mod: string;
}

interface CommandConfig {
  command: KeyboardCommand;
  callback: (e: any) => void;
}

interface KeyCommandProviderProps {
  debugLabel: string;
  element?: keyof ReactHTML;
  children: React.ReactNode;
}

export function createKeyCommandScope() {
  const scopeContext = createContext<any>(undefined);
  const Provider = createKeyCommandProvider(scopeContext);
  const useKeyCommands = (configs: CommandConfig[]) => {
    const keyCommandContext = useContext(scopeContext);
    useEffect(() => {
      if (!keyCommandContext) {
        throw Error(
          "Can't add key commands outside its scope. useKeyCommands should be used inside its scope."
        );
      }
      return keyCommandContext.addCommands(configs);
    }, [configs]);
  };
  return {
    Provider,
    useKeyCommands,
  };
}

function createKeyCommandProvider(scopeContext: React.Context<any>) {
  return function KeyCommandProvider(props: KeyCommandProviderProps) {
    const keyCommandParent = useContext(KeyCommandContext);
    const commandMap = useConstant(
      () => new Map<KeyboardCommand, CommandConfig>()
    );
    const commandActions = useMemo(
      () => ({
        addCommands: (configs: CommandConfig[]) => {
          configs.forEach((config) => {
            const command = config.command;
            if (commandMap.has(command)) {
              throw Error(`Conflicting key command for ${command}`);
            }
            commandMap.set(command, config);
          });
          return () => {
            configs.forEach((config) => {
              commandMap.delete(config.command);
            });
          };
        },
        removeCommand: (config: CommandConfig) => {
          commandMap.delete(config.command);
        },
        debugLabel: props.debugLabel,
      }),
      []
    );
    const ProviderElement = props.element ?? "div";
    const ScopeElement = () => (
      <ProviderElement
        onFocusCapture={() => {
          // TODO set as active scope
        }}
      >
        {props.children}
      </ProviderElement>
    );
    return (
      <KeyCommandContext.Provider value={commandActions}>
        <scopeContext.Provider value={commandActions}>
          <ScopeElement />
        </scopeContext.Provider>
      </KeyCommandContext.Provider>
    );
  };
}

const symbol = Symbol();
function useConstant<T>(callback: () => T) {
  const constantRef = useRef<typeof symbol | T>(symbol);
  if (constantRef.current === symbol) {
    constantRef.current = callback();
  }
  return constantRef.current;
}
