/**
 * Local client-side RAG (Retrieval-Augmented Generation) Engine.
 * Provides document chunking, indexing, and keyword/TF-IDF similarity search.
 */

// Common English stop words to filter out during indexing for better relevance
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can\'t', 'cannot', 'could',
  'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during', 'each', 'few', 'for',
  'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s',
  'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i', 'i\'d', 'i\'ll', 'i\'m',
  'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself', 'let\'s', 'me', 'more', 'most', 'mustn\'t',
  'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours',
  'ourselves', 'out', 'over', 'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'shouldn\'t',
  'so', 'some', 'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there',
  'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t',
  'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why', 'why\'s',
  'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself',
  'yourselves'
]);

/**
 * Tokenizes text into a clean array of terms.
 * 
 * 
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1 && !STOP_WORDS.has(token));
}

/**
 * Splits document content into manageable chunks with overlap.
 */
export function chunkDocument(docName, content, chunkSize = 400, overlap = 100) {
  const words = content.split(/\s+/);
  const chunks = [];
  let startIndex = 0;

  while (startIndex < words.length) {
    const chunkWords = words.slice(startIndex, startIndex + chunkSize);
    const chunkText = chunkWords.join(' ');
    
    chunks.push({
      id: `${docName}-chunk-${chunks.length}`,
      documentName: docName,
      text: chunkText,
      wordCount: chunkWords.length
    });

    startIndex += (chunkSize - overlap);
    if (words.length - startIndex < overlap) {
      // Avoid creating a tiny final chunk
      const finalWords = words.slice(startIndex);
      if (finalWords.length > 0) {
        chunks.push({
          id: `${docName}-chunk-${chunks.length}`,
          documentName: docName,
          text: finalWords.join(' '),
          wordCount: finalWords.length
        });
      }
      break;
    }
  }

  return chunks;
}

/**
 * Simple TF-IDF Vector Search Engine for browser-side retrieval.
 */
export class LocalVectorSearch {
  constructor() {
    this.chunks = []; // Holds all document chunks: { id, documentName, text }
    this.docCount = 0;
    this.df = {};     // Document frequency of terms
    this.idf = {};    // Inverse document frequency of terms
  }

  /**
   * Clears the index
   */
  clear() {
    this.chunks = [];
    this.docCount = 0;
    this.df = {};
    this.idf = {};
  }

  /**
   * Indexes a collection of chunks. Re-calculates DF/IDF.
   */
  indexChunks(allChunks) {
    this.clear();
    this.chunks = allChunks;
    this.docCount = allChunks.length;

    if (this.docCount === 0) return;

    // Calculate document frequencies (DF)
    allChunks.forEach(chunk => {
      const tokens = new Set(tokenize(chunk.text));
      tokens.forEach(token => {
        this.df[token] = (this.df[token] || 0) + 1;
      });
    });

    // Calculate Inverse Document Frequencies (IDF)
    Object.keys(this.df).forEach(token => {
      this.idf[token] = Math.log(1 + (this.docCount / this.df[token]));
    });
  }

  /**
   * Search chunks for the most relevant matches to the query.
   * Returns sorted list of chunks with scores.
   */
  search(query, limit = 3) {
    if (this.chunks.length === 0) return [];

    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    // Calculate query term weights (simple term frequency in query)
    const queryWeights = {};
    queryTokens.forEach(token => {
      queryWeights[token] = (queryWeights[token] || 0) + 1;
    });

    const results = this.chunks.map(chunk => {
      const chunkTokens = tokenize(chunk.text);
      const chunkTf = {};
      chunkTokens.forEach(token => {
        chunkTf[token] = (chunkTf[token] || 0) + 1;
      });

      // Calculate Cosine Similarity or basic dot product of query and chunk vectors
      let score = 0;
      let queryNorm = 0;
      let chunkNorm = 0;

      // Unique union of tokens
      const allTokens = new Set([...queryTokens, ...chunkTokens]);

      allTokens.forEach(token => {
        const idfVal = this.idf[token] || 0;
        
        const qVal = (queryWeights[token] || 0) * idfVal;
        const cVal = (chunkTf[token] || 0) * idfVal;

        score += qVal * cVal;
        queryNorm += qVal * qVal;
        chunkNorm += cVal * cVal;
      });

      const normalization = Math.sqrt(queryNorm) * Math.sqrt(chunkNorm);
      const finalScore = normalization > 0 ? (score / normalization) : 0;

      // Boost scores if there's direct phrase matching
      let phraseBonus = 0;
      const lowerQuery = query.toLowerCase();
      const lowerChunk = chunk.text.toLowerCase();
      if (lowerChunk.includes(lowerQuery)) {
        phraseBonus = 0.3;
      } else {
        // Boost if multiple query words appear near each other
        let matches = 0;
        queryTokens.forEach(token => {
          if (lowerChunk.includes(token)) matches++;
        });
        phraseBonus = (matches / queryTokens.length) * 0.15;
      }

      return {
        chunk,
        score: finalScore + phraseBonus
      };
    });

    // Filter out items with 0 score, sort descending, and take the limit
    return results
      .filter(res => res.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(res => ({
        ...res.chunk,
        score: Math.round(res.score * 100) / 100
      }));
  }
}
