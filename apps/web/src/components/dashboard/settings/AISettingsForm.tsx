'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { getAccessToken } from '@/lib/api/client';
import type { Organisation, UpdateOrganisationInput } from '@/lib/api/types';
import { Button, Input, Select } from '@accessshield/ui';
import { LoadingState } from '@/components/dashboard/common/LoadingState';

const AI_PROVIDER_OPTIONS = [
  { value: 'local', label: 'Local LLM (llama.cpp / GGUF on this machine)' },
];

const DEFAULT_MODELS: Record<'local', string> = {
  local: 'Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF',
};

async function fetchOrganisation(token: string): Promise<Organisation> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/organisation`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch organisation');
  const json = await response.json();
  return json.data;
}

async function updateOrganisation(token: string, input: UpdateOrganisationInput) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/organisation`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('Failed to update organisation');
  return response.json();
}

export function AISettingsForm() {
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState<'local'>('local');
  const [model, setModel] = useState(DEFAULT_MODELS.local);

  const { data: org, isLoading } = useQuery({
    queryKey: ['organisation'],
    queryFn: async () => {
      const token = await getAccessToken();
      return fetchOrganisation(token);
    },
  });

  useEffect(() => {
    if (!org) return;
    const nextProvider = 'local';
    setProvider(nextProvider);
    setModel(org.aiModel || DEFAULT_MODELS[nextProvider]);
  }, [org]);

  const updateMutation = useMutation({
    mutationFn: async (input: UpdateOrganisationInput) => {
      const token = await getAccessToken();
      return updateOrganisation(token, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisation'] });
    },
  });

  if (isLoading || !org) {
    return <LoadingState message="Loading AI settings…" variant="card" />;
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateMutation.mutate({
            aiProvider: provider,
            aiModel: model.trim() || DEFAULT_MODELS[provider],
          });
        }}
        className="space-y-4 rounded-lg border border-border bg-white p-6 shadow-sm"
      >
        <div>
          <h2 className="text-lg font-semibold text-text-primary">AI model configuration</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Choose Anthropic Claude (cloud) or a local GGUF model running inside the AI service.
            Local models download on first use and need enough RAM on the host.
          </p>
        </div>

        <Select
          name="aiProvider"
          label="AI inference provider"
          options={AI_PROVIDER_OPTIONS}
          value={provider}
          onValueChange={(value) => {
            const next = 'local';
            setProvider(next);
            setModel((current) => {
              const wasDefault = current === DEFAULT_MODELS.local;
              return wasDefault ? DEFAULT_MODELS[next] : current;
            });
          }}
          hint={
            'Requires llama-cpp-python on the AI service host (pip install ".[local]"). Set LOCAL_LLM_WARMUP=true to preload at startup.'
          }
        />

        <Input
          name="aiModel"
          label="Model identifier"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          required
          hint={
            "Hugging Face GGUF repo, e.g. Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF"
          }
        />

        {updateMutation.isError && (
          <p role="alert" className="text-sm text-error-700">
            Could not save AI settings. Try again.
          </p>
        )}
        {updateMutation.isSuccess && (
          <p className="text-sm text-success-700" role="status">
            AI settings saved. New fix / alt-text requests will use this provider.
          </p>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={updateMutation.isPending} aria-busy={updateMutation.isPending}>
            <Save className="mr-2 h-4 w-4" aria-hidden="true" />
            {updateMutation.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
