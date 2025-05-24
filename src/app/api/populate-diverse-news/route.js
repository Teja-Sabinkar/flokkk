// src/app/api/populate-diverse-news/route.js - Multiple RSS Sources
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request) {
  try {
    console.log('🌍 Populating diverse news sources...');
    
    const { db } = await connectToDatabase();
    console.log('✅ Database connected');
    
    const Parser = (await import('rss-parser')).default;
    const parser = new Parser({
      timeout: 15000,
      customFields: {
        item: [
          ['media:content', 'mediaContent'],
          ['description', 'description'],
          ['dc:creator', 'creator']
        ]
      }
    });
    
    // Diverse RSS sources from multiple providers
    const sources = [
      // BBC Sources
      {
        name: 'BBC News',
        url: 'http://feeds.bbci.co.uk/news/rss.xml',
        category: 'General News',
        priority: 1
      },
      {
        name: 'BBC Technology',
        url: 'http://feeds.bbci.co.uk/news/technology/rss.xml',
        category: 'Technology',
        priority: 1
      },
      {
        name: 'BBC Business',
        url: 'http://feeds.bbci.co.uk/news/business/rss.xml',
        category: 'Business',
        priority: 1
      },
      {
        name: 'BBC World',
        url: 'http://feeds.bbci.co.uk/news/world/rss.xml',
        category: 'World News',
        priority: 1
      },
      {
        name: 'BBC Sport',
        url: 'http://feeds.bbci.co.uk/sport/rss.xml',
        category: 'Sport',
        priority: 2
      },
      
      // CNN Sources
      {
        name: 'CNN Top Stories',
        url: 'http://rss.cnn.com/rss/edition.rss',
        category: 'General News',
        priority: 2
      },
      {
        name: 'CNN Technology',
        url: 'http://rss.cnn.com/rss/edition_technology.rss',
        category: 'Technology',
        priority: 2
      },
      
      // Tech Sources
      {
        name: 'TechCrunch',
        url: 'https://techcrunch.com/feed/',
        category: 'Technology',
        priority: 2
      },
      

      
      // Alternative sources (if above fail)
      {
        name: 'Ars Technica',
        url: 'http://feeds.arstechnica.com/arstechnica/index',
        category: 'Technology',
        priority: 3
      }
    ];
    
    let allItems = [];
    let successCount = 0;
    let failCount = 0;
    
    // Fetch from all sources concurrently
    const fetchPromises = sources.map(async (source) => {
      try {
        console.log(`📡 Fetching: ${source.name}`);
        
        const response = await fetch(source.url, {
          headers: {
            'User-Agent': 'TurtlePlatform/1.0 (+https://turtle.com)',
            'Accept': 'application/rss+xml, application/xml, text/xml',
          },
          signal: AbortSignal.timeout(15000)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const xmlData = await response.text();
        const feed = await parser.parseString(xmlData);
        
        const items = feed.items.slice(0, 15).map((item, index) => ({
          title: cleanText(item.title) || 'No title',
          link: item.link || '#',
          description: cleanText(item.description || item.contentSnippet) || '',
          pubDate: parseDate(item.pubDate),
          source: source.name,
          category: source.category,
          priority: source.priority,
          author: item.creator || item.author || '',
          batchId: new Date().toISOString(),
          createdAt: new Date(),
          fetchedAt: new Date(),
          guid: item.guid || item.link || `${source.name}-${Date.now()}-${index}`
        }));
        
        console.log(`✅ ${source.name}: ${items.length} items`);
        successCount++;
        return items;
        
      } catch (error) {
        console.error(`❌ ${source.name}: ${error.message}`);
        failCount++;
        return [];
      }
    });
    
    // Wait for all fetches to complete
    const results = await Promise.all(fetchPromises);
    
    // Combine all results
    results.forEach(items => {
      if (items.length > 0) {
        allItems.push(...items);
      }
    });
    
    console.log(`📊 Fetch complete: ${successCount} success, ${failCount} failed`);
    
    if (allItems.length === 0) {
      throw new Error('No news items fetched from any source');
    }
    
    // Remove duplicates based on title similarity
    allItems = removeDuplicates(allItems);
    
    // Sort by priority and publication date
    allItems.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority; // Lower priority number = higher priority
      }
      return new Date(b.pubDate) - new Date(a.pubDate); // Newer first
    });
    
    // Take top items (aim for around 60)
    allItems = allItems.slice(0, 70);
    
    // Assign rotation indices
    allItems = allItems.map((item, index) => ({
      ...item,
      rotationIndex: index
    }));
    
    console.log(`📰 Final count: ${allItems.length} diverse news items`);
    
    // Store in database
    const collectionName = 'rotating_news';
    await db.collection(collectionName).deleteMany({});
    console.log('🗑️ Cleared old news items');
    
    if (allItems.length > 0) {
      await db.collection(collectionName).insertMany(allItems);
      console.log(`💾 Stored ${allItems.length} diverse news items`);
    }
    
    // Count items by source
    const sourceStats = {};
    allItems.forEach(item => {
      sourceStats[item.source] = (sourceStats[item.source] || 0) + 1;
    });
    
    return NextResponse.json({
      success: true,
      message: 'Diverse news sources populated successfully!',
      totalItems: allItems.length,
      successfulSources: successCount,
      failedSources: failCount,
      sourceBreakdown: sourceStats,
      categories: [...new Set(allItems.map(item => item.category))],
      sampleItems: allItems.slice(0, 5).map(item => ({
        title: item.title.substring(0, 50) + '...',
        source: item.source,
        category: item.category,
        rotationIndex: item.rotationIndex
      }))
    });

  } catch (error) {
    console.error('❌ Diverse news population error:', error);
    return NextResponse.json({
      success: false,
      error: 'Diverse news population failed',
      message: error.message
    }, { status: 500 });
  }
}

// Helper functions
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .trim();
}

function parseDate(dateString) {
  try {
    return dateString ? new Date(dateString) : new Date();
  } catch (error) {
    return new Date();
  }
}

function removeDuplicates(items) {
  const seen = new Set();
  return items.filter(item => {
    const normalizedTitle = item.title.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 50);
    
    if (seen.has(normalizedTitle)) {
      return false;
    }
    
    seen.add(normalizedTitle);
    return true;
  });
}