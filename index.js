const Stripe = require('stripe');
const pug = require('pug');

const moment = require('moment');
const path = require('path');
const fs = require('fs');
const sizeOf = require('image-size');

const template = require(`./templates/default`);
const receiptTemplate = require('./templates/receipt');
const puppeteer = require("puppeteer");

const _ = require('lodash');

let browser = null;



module.exports.invoice = (key, config = {}) => async (invoiceId, data = {},callback,host) => {
  try {
    if ( browser === null ) {

      browser = await puppeteer.launch({ args: [ '--no-sandbox' ] });
    }


    const stripe = new Stripe(key);
    if ( !invoiceId ) {
      throw new Error('missing_invoice_id');
    }
    const invoice = await stripe.invoices.retrieve(invoiceId);
    //console.log(invoice);
    const customer = await stripe.customers.retrieve(invoice.customer);

    //console.log(customer);
    const account = await stripe.account.retrieve();
    // console.log(account);

    const tpld = template(Object.assign({
      currency_symbol: '$',
      label_invoice: 'invoice',
      label_invoice_to: 'invoice to',
      label_invoice_by: 'invoice by',
      label_due_on: 'Due on',
      label_invoice_for: 'invoice for',
      label_description: 'description',
      label_unit: 'unit',
      label_price: 'price ($)',
      label_amount: 'Amount',
      label_subtotal: 'subtotal',
      label_total: 'total',
      label_vat: 'vat',
      label_invoice_date: 'Date of issue',
      label_company_siret: 'Company SIRET',
      label_company_vat_number: 'Company VAT N°',
      label_invoice_number: 'Invoice number',
      label_reference_number: 'ref N°',
      label_invoice_due_date: 'Date due',
      business_name: account.business_name,
      business_url: account.business_url,
      support_email: account.support_email,
      support_url: account.support_url,
      business_address: account.support_address,
      date_format: 'MMMM DD, YYYY',
      client_company_name: 'Client Company',
      number: '12345',
      currency_position_before: true,
      language: 'en',
      host: host,
      customer_email:customer.email,
      customer_id:_.get(customer,'metadata.username',''),
      extra: _.get(customer,'metadata.extra',''),
      vat:_.get(customer,'metadata.vat','')
    }, invoice, config, data));


    let html = pug.compileFile(tpld.body)(Object.assign(tpld.data, {
      moment,
      path,
      fs,
      sizeOf
    }));

    let page = await browser.newPage();

    const session = await page.target().createCDPSession();
    await session.send('DOM.enable');
    await session.send('CSS.enable');
    session.on('CSS.fontsUpdated', async event => {

      await page.screenshot();
      let pdf = await   page.pdf({ format: 'letter' })
      callback(pdf);
      page.close();
      // event will be received when browser updates fonts on the page due to webfont loading.
    });
    page.setContent(html);
    await page.screenshot();
    let pdf = await   page.pdf({ format: 'letter' });
    callback(pdf);
    page.close();
  }
  catch(e){
    console.log(e);
    callback('Error Locating invoice');
  }

};

/**
 * receipt
 * @param key
 * @param config
 * @returns {Function}
 */
module.exports.receipt = (key, config = {}) => async (invoiceId, data = {},callback,host) => {

 try {
   if ( browser === null ) {

     browser = await puppeteer.launch({ args: [ '--no-sandbox' ] });
   }


   const stripe = new Stripe(key);
   if ( !invoiceId ) {
     throw new Error('missing_invoice_id');
   }
   const invoice = await stripe.invoices.retrieve(invoiceId);
   //console.log(invoice);
   const charge = await stripe.charges.retrieve(invoice.charge);
  // console.log('charge',charge);
   const customer = await stripe.customers.retrieve(invoice.customer);
   //console.log(customer);
   const account = await stripe.account.retrieve();
   // console.log(account);

   const tpld = receiptTemplate(Object.assign({
     currency_symbol: '$',
     label_invoice: 'invoice',
     label_invoice_to: 'invoice to',
     label_invoice_by: 'invoice by',
     label_paid_on: 'Paid on',
     label_invoice_for: 'invoice for',
     label_description: 'description',
     label_unit: 'unit',
     label_price: 'price ($)',
     label_amount: 'Amount',
     label_subtotal: 'subtotal',
     label_total: 'total',
     label_vat: 'vat',
     label_invoice_date: 'Date of issue',
     label_invoice_paid_date:'Paid date',
     label_company_siret: 'Company SIRET',
     label_company_vat_number: 'Company VAT N°',
     label_receipt_number: 'Receipt number',
     label_invoice_number: 'Invoice number',
     label_reference_number: 'ref N°',
     label_invoice_due_date: 'Date due',
     business_name: account.business_name,
     business_url: account.business_url,
     support_email: account.support_email,
     support_url: account.support_url,
     business_address: account.support_address,
     date_format: 'MMMM DD, YYYY',
     client_company_name: 'Client Company',
     customer_email:customer.email,
     customer_id:_.get(customer,'metadata.username',''),
     number: '12345',
     currency_position_before: true,
     language: 'en',
     created:charge.created,
     payment_by:charge.source.brand+' '+ charge.source.last4,
     host: host,
     extra: _.get(customer,'metadata.extra',''),
     vat:_.get(customer,'metadata.vat','')
   }, invoice, config, data));


   let html = pug.compileFile(tpld.body)(Object.assign(tpld.data, {
     moment,
     path,
     fs,
     sizeOf
   }));

   let page = await browser.newPage();

   const session = await page.target().createCDPSession();
   await session.send('DOM.enable');
   await session.send('CSS.enable');
   session.on('CSS.fontsUpdated', async event => {

     await page.screenshot();
     let pdf = await   page.pdf({ format: 'letter' })
     callback(pdf);
     page.close();
     // event will be received when browser updates fonts on the page due to webfont loading.
   });
   page.setContent(html);
   await page.screenshot();
   let pdf = await   page.pdf({ format: 'letter' });
   callback(pdf);
   page.close();
 }
 catch(e){
   callback('Error locating receipt');
 }

};