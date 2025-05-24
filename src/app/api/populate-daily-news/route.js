// src/app/api/populate-daily-news/route.js - Daily RSS Fetcher for 200-300 Items
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request) {
  try {
    console.log('🌅 Daily RSS news fetch started...');
    const startTime = Date.now();

    const { db } = await connectToDatabase();
    console.log('✅ Database connected');

    const Parser = (await import('rss-parser')).default;
    const parser = new Parser({
      timeout: 20000, // Increased timeout for larger fetches
      customFields: {
        item: [
          ['media:content', 'mediaContent'],
          ['description', 'description'],
          ['dc:creator', 'creator']
        ]
      }
    });

    // Enhanced RSS sources with more items per source
    const sources = [
      // BBC Sources (Primary - High Item Count)
      {
        name: 'BBC News',
        url: 'http://feeds.bbci.co.uk/news/rss.xml',
        category: 'General News',
        priority: 1,
        maxItems: 40 // Increased from 15
      },
      {
        name: 'BBC Technology',
        url: 'http://feeds.bbci.co.uk/news/technology/rss.xml',
        category: 'Technology',
        priority: 1,
        maxItems: 30
      },
      {
        name: 'BBC Business',
        url: 'http://feeds.bbci.co.uk/news/business/rss.xml',
        category: 'Business',
        priority: 1,
        maxItems: 30
      },
      {
        name: 'BBC World',
        url: 'http://feeds.bbci.co.uk/news/world/rss.xml',
        category: 'World News',
        priority: 1,
        maxItems: 35
      },
      {
        name: 'BBC Sport',
        url: 'http://feeds.bbci.co.uk/sport/rss.xml',
        category: 'Sport',
        priority: 2,
        maxItems: 25
      },

      // CNN Sources (Secondary - Medium Item Count)
      {
        name: 'CNN Top Stories',
        url: 'http://rss.cnn.com/rss/edition.rss',
        category: 'General News',
        priority: 2,
        maxItems: 30
      },
      {
        name: 'CNN Technology',
        url: 'http://rss.cnn.com/rss/edition_technology.rss',
        category: 'Technology',
        priority: 2,
        maxItems: 25
      },

      // Tech Sources (Specialized)
      {
        name: 'TechCrunch',
        url: 'https://techcrunch.com/feed/',
        category: 'Technology',
        priority: 2,
        maxItems: 30
      },
      {
        name: 'Ars Technica',
        url: 'http://feeds.arstechnica.com/arstechnica/index',
        category: 'Technology',
        priority: 2,
        maxItems: 25
      }
    ];

    let allItems = [];
    let successCount = 0;
    let failCount = 0;
    let totalFetchTime = 0;

    console.log(`🚀 Fetching from ${sources.length} sources for daily news batch...`);

    // Fetch from all sources with enhanced error handling
    const fetchPromises = sources.map(async (source) => {
      const sourceStartTime = Date.now();

      try {
        console.log(`📡 Fetching: ${source.name} (target: ${source.maxItems} items)`);

        const response = await fetch(source.url, {
          headers: {
            'User-Agent': 'TurtlePlatform/1.0 (+https://turtle.com)',
            'Accept': 'application/rss+xml, application/xml, text/xml',
          },
          signal: AbortSignal.timeout(20000)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const xmlData = await response.text();
        const feed = await parser.parseString(xmlData);

        // Get more items per source for daily batch
        const items = feed.items.slice(0, source.maxItems).map((item, index) => ({
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

        const fetchTime = Date.now() - sourceStartTime;
        totalFetchTime += fetchTime;

        console.log(`✅ ${source.name}: ${items.length} items (${fetchTime}ms)`);
        successCount++;
        return items;

      } catch (error) {
        const fetchTime = Date.now() - sourceStartTime;
        totalFetchTime += fetchTime;

        console.error(`❌ ${source.name}: ${error.message} (${fetchTime}ms)`);
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

    console.log(`📊 Fetch summary: ${successCount} success, ${failCount} failed, ${totalFetchTime}ms total`);

    if (allItems.length === 0) {
      throw new Error('No news items fetched from any source');
    }

    // Enhanced duplicate removal for larger dataset
    console.log(`🔍 Removing duplicates from ${allItems.length} items...`);
    allItems = removeDuplicatesAdvanced(allItems);
    console.log(`✂️ After deduplication: ${allItems.length} items`);

    // Sort by priority and publication date
    allItems.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority; // Lower priority number = higher priority
      }
      return new Date(b.pubDate) - new Date(a.pubDate); // Newer first
    });

    // Target 200-300 items for daily rotation
    const targetItems = Math.min(allItems.length, 300);
    allItems = allItems.slice(0, targetItems);

    // Assign rotation indices
    allItems = allItems.map((item, index) => ({
      ...item,
      rotationIndex: index
    }));

    console.log(`📰 Final daily batch: ${allItems.length} diverse news items`);

    // Store in database
    const collectionName = 'rotating_news';
    await db.collection(collectionName).deleteMany({});
    console.log('🗑️ Cleared old news items');

    if (allItems.length > 0) {
      await db.collection(collectionName).insertMany(allItems);
      console.log(`💾 Stored ${allItems.length} daily news items`);
    }

    // Calculate rotation timing
    const rotationTimeMinutes = (allItems.length * 60) / 60; // 60 seconds per item
    const rotationTimeHours = rotationTimeMinutes / 60;

    // Generate source breakdown
    const sourceStats = {};
    const categoryStats = {};
    allItems.forEach(item => {
      sourceStats[item.source] = (sourceStats[item.source] || 0) + 1;
      categoryStats[item.category] = (categoryStats[item.category] || 0) + 1;
    });

    const duration = Date.now() - startTime;
    console.log(`🎉 Daily news fetch completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      message: 'Daily news batch populated successfully!',
      totalItems: allItems.length,
      successfulSources: successCount,
      failedSources: failCount,
      duration: `${duration}ms`,
      totalFetchTime: `${totalFetchTime}ms`,
      rotationTime: {
        totalMinutes: Math.round(rotationTimeMinutes),
        totalHours: Math.round(rotationTimeHours * 10) / 10,
        secondsPerItem: 60
      },
      sourceBreakdown: sourceStats,
      categoryBreakdown: categoryStats,
      nextFetch: 'Tomorrow at 6:00 AM',
      sampleItems: allItems.slice(0, 5).map(item => ({
        title: item.title.substring(0, 60) + '...',
        source: item.source,
        category: item.category,
        rotationIndex: item.rotationIndex
      }))
    });

  } catch (error) {
    console.error('❌ Daily news population error:', error);
    return NextResponse.json({
      success: false,
      error: 'Daily news population failed',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Enhanced helper functions
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

// Advanced duplicate removal for larger datasets
function removeDuplicatesAdvanced(items) {
  const seen = new Set();
  const seenUrls = new Set();

  return items.filter(item => {
    // Check by URL first (most reliable)
    if (item.link && item.link !== '#') {
      if (seenUrls.has(item.link)) {
        return false;
      }
      seenUrls.add(item.link);
    }

    // Check by normalized title
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