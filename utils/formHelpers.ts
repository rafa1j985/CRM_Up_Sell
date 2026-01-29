// WhatsApp Mask (Strict (xx) XXXXX-XXXX)
export const formatPhone = (value: string): string => {
  // Remove non-numeric characters
  const numbers = value.replace(/\D/g, '');
  
  // Limit to 11 digits
  const truncated = numbers.slice(0, 11);

  // Apply mask
  if (truncated.length === 0) return '';
  if (truncated.length <= 2) return `(${truncated}`;
  if (truncated.length <= 7) return `(${truncated.slice(0, 2)}) ${truncated.slice(2)}`;
  return `(${truncated.slice(0, 2)}) ${truncated.slice(2, 7)}-${truncated.slice(7)}`;
};

export const STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

// Simplified list of major cities/hubs for VOLL formations
// Ideally this would come from an API, but keeping it static for the "Closed Item" requirement.
export const CITIES_BY_STATE: Record<string, string[]> = {
  'AC': ['Rio Branco'],
  'AL': ['Maceió'],
  'AP': ['Macapá'],
  'AM': ['Manaus'],
  'BA': ['Salvador', 'Feira de Santana', 'Vitória da Conquista'],
  'CE': ['Fortaleza'],
  'DF': ['Brasília'],
  'ES': ['Vitória', 'Vila Velha'],
  'GO': ['Goiânia', 'Aparecida de Goiânia'],
  'MA': ['São Luís'],
  'MT': ['Cuiabá'],
  'MS': ['Campo Grande'],
  'MG': ['Belo Horizonte', 'Uberlândia', 'Juiz de Fora', 'Contagem'],
  'PA': ['Belém'],
  'PB': ['João Pessoa'],
  'PR': ['Curitiba', 'Londrina', 'Maringá'],
  'PE': ['Recife', 'Jaboatão dos Guararapes'],
  'PI': ['Teresina'],
  'RJ': ['Rio de Janeiro', 'Niterói', 'Duque de Caxias', 'São Gonçalo'],
  'RN': ['Natal'],
  'RS': ['Porto Alegre', 'Caxias do Sul', 'Canoas'],
  'RO': ['Porto Velho'],
  'RR': ['Boa Vista'],
  'SC': ['Florianópolis', 'Joinville', 'Blumenau'],
  'SP': ['São Paulo', 'Campinas', 'Santos', 'Ribeirão Preto', 'São José dos Campos', 'Sorocaba', 'Santo André', 'São Bernardo do Campo'],
  'SE': ['Aracaju'],
  'TO': ['Palmas']
};