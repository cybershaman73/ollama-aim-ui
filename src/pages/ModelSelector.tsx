import { useChat } from './../context/ChatContext';

const ModelSelector = () => {
  const { availableModels, setCurrentModel, activeModel } = useChat();

  return (
    <select
      defaultValue={activeModel}
      className="rounded-md items-center justify-center text-white bg-slate-900 border-1 border-slate-700 px-2 py-2"
      onChange={(e) => {
        setCurrentModel(e.target.value);
      }}
    >
      {availableModels?.map((model) => (
        <option key={model} value={model} className="py-1 px-2 text-xs  text-left">
          {model}
        </option>
      ))}
    </select>
  );
}

export default ModelSelector;