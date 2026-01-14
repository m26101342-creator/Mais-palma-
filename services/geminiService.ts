
import { GoogleGenAI } from "@google/genai";

// Função helper para obter a instância da IA de forma segura
const getAI = () => {
  // @ts-ignore - Vite define replacement ensures this works, but TS might complain about process global
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    console.warn("API Key do Google Gemini não encontrada. Configure a variável de ambiente API_KEY.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export interface ProposalData {
  itemName: string; 
  quantity: number; 
  totalPrice: number;
  hasImpermeabilization?: boolean;
}

export const generateSalesProposal = async (
  clientName: string,
  data: ProposalData
): Promise<string> => {
  
  const ai = getAI();
  if (!ai) return "Erro: Chave de API não configurada no sistema. Contacte o administrador.";

  const model = "gemini-3-flash-preview"; // Updated to recommended model
  
  const price = new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(data.totalPrice);

  const prompt = `
    Aja como o "Assistente Mais Palma", um especialista em vendas da empresa Mais Palma Lda.
    Escreva uma mensagem curta e profissional para WhatsApp para o cliente "${clientName}".
    
    Contexto: Empresa "Mais Palma" (Excelência em higienização).
    Moeda: Kwanza (Kz).
    
    Orçamento:
    - Itens/Serviços: ${data.itemName}
    - Total de Itens: ${data.quantity}
    - Valor Final Total: ${price}
    ${data.hasImpermeabilization ? `- Inclui Impermeabilização` : ''}
    
    Requisitos:
    1. Texto MUITO CURTO (máximo 4 frases curtas).
    2. Liste resumidamente os itens se for relevante, senão foque no valor total.
    3. Sem "assunto" ou cabeçalhos. Apenas o corpo da mensagem.
    4. Use português de Angola.
    5. Termine com uma pergunta de fechamento ("Podemos agendar?").
    6. NÃO invente nomes de outras empresas. Somos a Mais Palma.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });
    
    return response.text || "Erro ao gerar proposta.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Olá! Segue o orçamento solicitado. Podemos agendar?";
  }
};

export const askAIExpert = async (question: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return "Erro de configuração: API Key ausente.";

  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Aja como o "Assistente Mais Palma", um consultor sênior da empresa Mais Palma.
    Responda à seguinte dúvida do gestor de forma curta, técnica e direta (máximo 3 frases).
    Use português de Angola.
    
    Dúvida: "${question}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });
    
    return response.text || "Não consegui processar a resposta.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Erro de conexão com o Assistente Mais Palma.";
  }
};
