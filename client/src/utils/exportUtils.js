import * as XLSX from 'xlsx';

export const exportCampaignToExcel = (campaignData, selectedDomainsSet) => {
  const { campaign, qualified } = campaignData;
  const brief = campaign.brief;
  const targetPages = typeof brief.target_pages === 'string'
    ? JSON.parse(brief.target_pages)
    : (brief.target_pages || []);

  // Filter only the domains the user actually selected
  const selectedDomains = qualified.filter(d => selectedDomainsSet.has(d.domain));

  // ==========================================
  // TAB 1: Client Info (20 Columns)
  // ==========================================
  const clientInfoData = [{
      'Client Name': campaign.client_name,
      'Client Status': 'Active',
      'Order / Period': 1,
      'Order Start Date': new Date().toLocaleDateString(),
      'Order Deadline': '',
      'Link Volume': brief.link_count_goal,
      'Budget Per Target': brief.budget,
      'Min. DR': brief.min_dr,
      'Min. Traffic': brief.min_traffic,
      'Order Payment Date': '',
      'Order Type': 'Monthly',
      'Domains': campaign.client_name,
      'Target Pages': targetPages.map(p => p.url).join(' '),
      'Domain Approval': 'No',
      'Domain Approval Tracker': '',
      'Order / Period Notes': '',
      'Team in Charge': '',
      'Links Live': 0,
      'Order / Period Shortfall': 0,
      'Link Tracker': '',
      'Order Status': 'In Progress',
      'Account Manager': ''
  }];

  // ==========================================
  // TAB 2: Client Target Pages (3 Columns)
  // ==========================================
  const targetPagesData = targetPages.map(page => ({
    'Target URL': page.url,
    'Primary Keyword': page.keyword,
    'Notes': ''
  }));

  // ==========================================
  // TAB 3: Campaign Management (32 Columns)
  // ==========================================
  // The spec explicitly requires these specific fields
  const currentPeriod = `${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`;
  
  const campaignManagementData = selectedDomains.map((item, index) => {
      const raw = item.raw_data;
      const assignedPage = targetPages[index % targetPages.length] || { url: '', keyword: '' };
      const rawPriceStr = String(raw.gp_price || raw.li_price || '').replace(/[^0-9.]/g, '');
      const orderPrice = parseFloat(rawPriceStr) || 0;
      const clientBudget = parseFloat(brief.budget);

      return {
          'Period': 1,
          'Period Start Date': new Date().toLocaleDateString(),
          'Order #': `ORD-${String(index + 1).padStart(3, '0')}`,
          'Order Date': new Date().toLocaleDateString(),
          'Placement Domain': item.domain,
          'Placement URL': '',
          'DR': raw.dr || '',
          'Traffic': raw.traffic || '',
          'Order Price': orderPrice,
          'DB Price': '-',
          'Can Use': 'Yes',
          'TAT': raw.tat || '',
          'Target URL': assignedPage.url,
          'Anchor Text': assignedPage.keyword,
          'Link Type': raw.link_type || '',
          'Budget': clientBudget,
          'Profit': orderPrice && clientBudget ? clientBudget - orderPrice : '',
          'Status': 'To Contact',
          'Publishing Date': '',
          'Contact Email': raw.contact || '',
          'Thread ID': '',
          'Team': '',
          'Notes': '',
          'Review Status': '',
          'Review Notes': '',
          'Topics/Snippets': '',
          'GP Doc': '',
          'Content Status': '',
          'Payment Invoice': '',
          'Vendor Name (on the invoice)': '',
          'Request Type': '',
          'Invoice Link No.': '',
          'Payment Status': '',
          'Payment Notes': '',
          'Hash': ''
      };
  });

  // ==========================================
  // TAB 4: Client Referring Domains (13 Columns)
  // ==========================================
  // Empty template ready for the delivery team
  const refDomainsData = [{
    'Domain': '',
    'DR': '',
    'Traffic': '',
    'First Seen': '',
    'Anchor Text': '',
    'Target URL': '',
    'Link Type': '',
    'Status': '',
    'Contact': '',
    'Notes': '',
    'Date Added': '',
    'Last Updated': '',
    'Hash': ''
}];

  // 1. Create Sheets
  const ws1 = XLSX.utils.json_to_sheet(clientInfoData);
  const ws2 = XLSX.utils.json_to_sheet(targetPagesData);
  const ws3 = XLSX.utils.json_to_sheet(campaignManagementData);
  const ws4 = XLSX.utils.json_to_sheet(refDomainsData);

  // 2. Create Workbook and Append Sheets
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, "Client Info");
  XLSX.utils.book_append_sheet(wb, ws2, "Target Pages");
  XLSX.utils.book_append_sheet(wb, ws3, "CM");
  XLSX.utils.book_append_sheet(wb, ws4, "Referring Domains");

  // 3. Generate File and Trigger Download
  const fileName = `BlueTree_Campaign_${campaign.client_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};