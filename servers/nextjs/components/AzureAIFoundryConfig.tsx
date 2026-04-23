"use client";

interface AzureAIFoundryConfigProps {
  azureEndpoint: string;
  azureModel: string;
  azureManagedIdentityClientId: string;
  onInputChange: (value: string | boolean, field: string) => void;
}

export default function AzureAIFoundryConfig({
  azureEndpoint,
  azureModel,
  azureManagedIdentityClientId,
  onInputChange,
}: AzureAIFoundryConfigProps) {
  return (
    <div className="space-y-6">
      {/* Managed Identity Info */}
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
        <h3 className="text-sm font-semibold text-blue-900 mb-1">
          Azure AI Foundry – Managed Identity
        </h3>
        <p className="text-sm text-blue-700">
          Authentication uses Azure Managed Identity (DefaultAzureCredential).
          No API key is required.
        </p>
      </div>

      {/* Endpoint */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Azure AI Foundry Endpoint
        </label>
        <input
          type="text"
          value={azureEndpoint}
          onChange={(e) =>
            onInputChange(e.target.value, "azure_ai_foundry_endpoint")
          }
          className="w-full px-4 py-2.5 outline-none border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          placeholder="https://your-project.services.ai.azure.com/"
        />
      </div>

      {/* Model */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Model Name
        </label>
        <input
          type="text"
          value={azureModel}
          onChange={(e) =>
            onInputChange(e.target.value, "azure_ai_foundry_model")
          }
          className="w-full px-4 py-2.5 outline-none border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          placeholder="e.g. gpt-4o"
        />
        <p className="mt-1 text-xs text-gray-500">
          The deployment or model name configured in your Azure AI Foundry project.
        </p>
      </div>

      {/* Managed Identity Client ID (optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Managed Identity Client ID{" "}
          <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={azureManagedIdentityClientId}
          onChange={(e) =>
            onInputChange(
              e.target.value,
              "azure_managed_identity_client_id"
            )
          }
          className="w-full px-4 py-2.5 outline-none border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          placeholder="Only needed for user-assigned managed identity"
        />
        <p className="mt-1 text-xs text-gray-500">
          Leave empty to use the system-assigned managed identity.
        </p>
      </div>
    </div>
  );
}
