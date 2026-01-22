/**
 * Knowledge Base Section Component
 *
 * Manage knowledge base article assignments for guests.
 * Converted from TypeScript to JavaScript following Split Lease patterns.
 */

import { useState } from 'react';
import { BookOpen, Plus, Trash2, ChevronDown } from 'lucide-react';

export default function KnowledgeBaseSection({
  articles,
  assignedArticles,
  selectedArticle,
  isLoading,
  onArticleSelect,
  onAddArticle,
  onRemoveArticle
}) {
  const [showDropdown, setShowDropdown] = useState(false);

  function handleAddArticle() {
    if (selectedArticle) {
      onAddArticle(selectedArticle);
    }
  }

  return (
    <div className="grd-section">
      <div className="grd-kb-header">
        <h2 className="grd-section-title">
          <BookOpen size={20} />
          Knowledge Base / Blog Article...
        </h2>
      </div>

      <div className="grd-kb-add-form">
        <div className="grd-dropdown-wrapper">
          <button
            className="grd-dropdown-trigger"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            {selectedArticle
              ? articles.find(a => a.id === selectedArticle)?.pageHeadline || 'Select an article...'
              : 'Select an article...'}
            <ChevronDown size={16} />
          </button>
          {showDropdown && (
            <div className="grd-dropdown-menu">
              {articles.length > 0 ? (
                articles.map(article => (
                  <button
                    key={article.id}
                    className="grd-dropdown-option-btn"
                    onClick={() => {
                      onArticleSelect(article.id);
                      setShowDropdown(false);
                    }}
                  >
                    <span className="grd-option-headline">{article.pageHeadline}</span>
                    <span className="grd-option-subtext">{article.pageHeadlineSubtext}</span>
                  </button>
                ))
              ) : (
                <div className="grd-dropdown-empty">No more articles available</div>
              )}
            </div>
          )}
        </div>
        <button
          className="grd-btn grd-btn-primary grd-btn-sm"
          onClick={handleAddArticle}
          disabled={!selectedArticle || isLoading}
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      <div className="grd-kb-articles-list">
        {assignedArticles.length > 0 ? (
          assignedArticles.map(article => (
            <div key={article.id} className="grd-kb-article-card">
              <div className="grd-article-icon">
                <BookOpen size={20} />
              </div>
              <div className="grd-article-content">
                <h4 className="grd-article-headline">{article.pageHeadline}</h4>
                <p className="grd-article-subtext">{article.pageHeadlineSubtext}</p>
              </div>
              <button
                className="grd-btn grd-btn-remove"
                onClick={() => onRemoveArticle(article.id)}
                disabled={isLoading}
              >
                <Trash2 size={14} />
                Remove
              </button>
            </div>
          ))
        ) : (
          <div className="grd-empty-state">
            <BookOpen size={32} />
            <p>No knowledge base articles assigned</p>
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="grd-loading-indicator">
          <div className="grd-spinner-sm"></div>
          <span>Processing...</span>
        </div>
      )}
    </div>
  );
}
