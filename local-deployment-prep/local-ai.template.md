# Local AI Integration (Ollama / LM Studio)

## Strategy: Free-First Autonomy
VELO Local will prioritize local inference engines to ensure zero cost and offline availability.

## Integration Points
1. **Ollama (Default)**:
   - Port: 11434
   - Models: `llama3`, `mistral`, `phi3`
   - Role: General reasoning, classification, and drafting.

2. **LM Studio (Developer/Research)**:
   - Port: 1234 (OpenAI compatible)
   - Role: Testing complex prompts and vision models.

3. **Fallback Logic**:
   - Local LLM -> Local Template -> Offline Queue -> Manual Staging.

## Requirements
- AVX2/AVX512 support on CPU.
- 8GB+ RAM (16GB recommended for 7B+ models).
- (Optional) NVIDIA GPU with 8GB+ VRAM for high-speed Galaxy Scanning.
