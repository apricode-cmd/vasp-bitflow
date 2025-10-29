'use client';

import { useEffect } from 'react';
import './legal-styles.css'; // Import custom styles

interface LegalPageClientProps {
  htmlContent: string | null;
}

export function LegalPageClient({ htmlContent }: LegalPageClientProps) {
  useEffect(() => {
    if (!htmlContent) return;

    // Generate Table of Contents from headings
    const generateTOC = () => {
      const contentElement = document.querySelector('.legal-content');
      const tocNav = document.getElementById('toc-nav');
      
      if (!contentElement || !tocNav) return;

      const headings = contentElement.querySelectorAll('h1, h2, h3');
      
      if (headings.length === 0) {
        tocNav.innerHTML = '<div class="text-sm text-muted-foreground px-3 py-2">No sections found</div>';
        return;
      }

      // Add IDs to headings for navigation
      headings.forEach((heading, index) => {
        if (!heading.id) {
          heading.id = `section-${index}`;
        }
      });

      // Create TOC links
      const tocLinks = Array.from(headings).map((heading, index) => {
        const level = parseInt(heading.tagName.substring(1));
        const text = heading.textContent || '';
        const id = heading.id;
        
        return `
          <a 
            href="#${id}" 
            data-level="${level}"
            class="toc-link block py-1 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-md transition-all ${level === 2 ? 'pl-4' : level === 3 ? 'pl-6' : ''}"
          >
            ${text}
          </a>
        `;
      }).join('');

      tocNav.innerHTML = tocLinks;

      // Smooth scroll and active state handling
      const links = tocNav.querySelectorAll('a');
      links.forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const targetId = link.getAttribute('href')?.substring(1);
          if (targetId) {
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
              const headerOffset = 80;
              const elementPosition = targetElement.getBoundingClientRect().top;
              const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

              window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
              });

              // Update active state
              links.forEach(l => l.classList.remove('font-semibold', 'text-primary', 'bg-primary/5'));
              link.classList.add('font-semibold', 'text-primary', 'bg-primary/5');
            }
          }
        });
      });

      // Highlight active section on scroll
      const observerOptions = {
        rootMargin: '-80px 0px -80% 0px',
        threshold: 0
      };

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            const activeLink = tocNav.querySelector(`a[href="#${id}"]`);
            if (activeLink) {
              links.forEach(l => l.classList.remove('font-semibold', 'text-primary', 'bg-primary/5'));
              activeLink.classList.add('font-semibold', 'text-primary', 'bg-primary/5');
            }
          }
        });
      }, observerOptions);

      headings.forEach(heading => observer.observe(heading));
    };

    // Generate TOC after content is rendered
    setTimeout(generateTOC, 100);
  }, [htmlContent]);

  return (
    <div className="legal-document-wrapper">
      {htmlContent ? (
        <article
          className="legal-content"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      ) : (
        <div className="legal-loading">
          <div className="legal-loading-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <p className="legal-loading-text">Document content is being prepared.</p>
        </div>
      )}
    </div>
  );
}



