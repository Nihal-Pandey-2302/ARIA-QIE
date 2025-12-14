# backend/app.py - FOCUSED DOCUMENT ANALYSIS BY TYPE
from flask import Flask, request, jsonify
from dotenv import load_dotenv
import os
import json
from flask_cors import CORS
import pypdf
import requests
import io
from datetime import datetime
import re
from pypdf import PdfReader # ✅ Specific import needed for extraction logic
from groq_service import GroqService # ✅ Import GroqService
from oracle_service import OracleService
from web3 import Web3
from contract_info import ARIAMARKETPLACE_ADDRESS, ARIAMARKETPLACE_ABI, ORACLE_ADDRESS
# Import our blockchain service and QIEDEX service
from blockchain_service import BlockchainService
from qiedex_service import QIEDEXService
import time

# --- CONFIGURATION LOADING ---
# Force load .env from the same directory as app.py
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(dotenv_path):
    print(f"Loading .env from: {dotenv_path}")
    load_dotenv(dotenv_path)
else:
    print("WARNING: .env file not found!")

app = Flask(__name__)
CORS(app)

import random

# --- API KEY CONFIGURATION ---
# Support multiple keys for rotation to avoid rate limits
GEMINI_API_KEYS = []
# PINATA API keys are still needed
PINATA_API_KEY = os.getenv("PINATA_API_KEY")
PINATA_SECRET_API_KEY = os.getenv("PINATA_SECRET_API_KEY")

# ✅ NEW: Initialize Groq instead of Gemini
try:
    groq_service = GroqService()
    if groq_service.client:
        print("✅ Groq AI service initialized successfully")
    else:
        print("⚠️ Groq Service initialized but client is None (ApiKey missing?)")
except Exception as e:
    print(f"❌ Failed to initialize Groq: {e}")
    groq_service = None

# --- DOCUMENT TYPE DEFINITIONS WITH FOCUSED ANALYSIS ---
DOCUMENT_TYPES = {
    "invoice": {
        "name": "Invoice",
        "icon": "💰",
        "fields": ["invoice_number", "total_amount", "currency", "date", "vendor_name", "buyer_name", "items"],
        "authenticity_markers": ["company letterhead", "tax ID", "invoice number", "digital signature", "QR code"],
        "analysis_focus": "Extract invoice details, verify mathematical calculations, check for official stamps/seals"
    },
    "property_deed": {
        "name": "Property Deed",
        "icon": "🏠",
        "fields": ["property_address", "owner_name", "property_value", "transaction_date", "legal_description", "plot_number"],
        "authenticity_markers": ["government seal", "notary stamp", "registration number", "official signatures"],
        "analysis_focus": "Extract property details, verify legal descriptions, check for government authentication"
    },
    "vehicle_registration": {
        "name": "Vehicle Registration",
        "icon": "🚗",
        "fields": ["vin", "make", "model", "year", "owner_name", "registration_date", "plate_number", "engine_number"],
        "authenticity_markers": ["DMV/RTO seal", "registration number", "security watermarks", "holograms"],
        "analysis_focus": "Extract vehicle specifications, verify VIN format, check for official RTO/DMV marks"
    },
    "certificate": {
        "name": "Educational Certificate",
        "icon": "🎓",
        "fields": ["recipient_name", "institution_name", "degree_title", "date_issued", "grade", "credential_id"],
        "authenticity_markers": ["university seal", "signatures", "embossed stamps", "security features"],
        "analysis_focus": "Extract academic credentials, verify institution details, check for official seals"
    },
    "supply_chain": {
        "name": "Supply Chain Document",
        "icon": "📦",
        "fields": ["shipment_id", "origin", "destination", "goods_description", "quantity", "value", "shipping_date", "carrier"],
        "authenticity_markers": ["company logos", "tracking numbers", "barcodes", "carrier stamps"],
        "analysis_focus": "Extract shipment details, verify tracking information, check for carrier authentication"
    },
    "medical_record": {
        "name": "Medical Record",
        "icon": "⚕️",
        "fields": ["patient_name", "doctor_name", "diagnosis", "treatment", "date", "hospital_name", "prescription"],
        "authenticity_markers": ["hospital letterhead", "doctor signature", "medical registration number", "hospital seal"],
        "analysis_focus": "Extract medical information, verify doctor credentials, check for hospital authentication"
    },
    "legal_contract": {
        "name": "Legal Contract",
        "icon": "📜",
        "fields": ["contract_type", "party_names", "effective_date", "expiry_date", "contract_value", "terms_summary"],
        "authenticity_markers": ["party signatures", "notary seal", "witness signatures", "legal stamps"],
        "analysis_focus": "Extract contract terms, verify party information, check for legal authentication"
    },
    "insurance_policy": {
        "name": "Insurance Policy",
        "icon": "🛡️",
        "fields": ["policy_number", "insured_name", "coverage_amount", "premium", "start_date", "end_date", "insurer_name"],
        "authenticity_markers": ["company logo", "policy number", "authorized signatures", "company seal"],
        "analysis_focus": "Extract policy details, verify coverage information, check for insurer authentication"
    }
}

def upload_to_ipfs(json_data: dict) -> tuple:
    """Upload JSON metadata to IPFS via Pinata and return (full_url, hash_only)"""
    if not PINATA_API_KEY or not PINATA_SECRET_API_KEY:
        raise Exception("Pinata API keys not set in .env")
    
    headers = {
        "Content-Type": "application/json",
        "pinata_api_key": PINATA_API_KEY,
        "pinata_secret_api_key": PINATA_SECRET_API_KEY
    }
    
    body = {
        "pinataContent": json_data,
        "pinataMetadata": {
            "name": json_data.get("name", "rwa_metadata.json")
        }
    }
    
    response = requests.post(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        json=body,
        headers=headers
    )
    response.raise_for_status()
    
    ipfs_hash_only = response.json().get("IpfsHash")
    if not ipfs_hash_only:
        raise Exception("Failed to get IPFS hash from Pinata response")
    
    return (f"https://gateway.pinata.cloud/ipfs/{ipfs_hash_only}", ipfs_hash_only)

# QR Code Logic Removed for Render Compatibility
def find_and_decode_qr(image_bytes, mime_type):
    """(Disabled) Placeholder for QR Code Scanning"""
    return None

# ✅ LOCAL FALLBACK REMOVED AS REQUESTED

def generate_focused_prompt(doc_type: str) -> str:
    """Generate AI prompt focused on specific document type"""
    
    doc_info = DOCUMENT_TYPES.get(doc_type)
    if not doc_info:
        doc_info = DOCUMENT_TYPES["invoice"]  # Fallback
    
    fields_str = ", ".join(doc_info["fields"])
    markers_str = ", ".join(doc_info["authenticity_markers"])
    
    # Get current date for context
    current_date = datetime.now().strftime("%B %d, %Y")
    current_year = datetime.now().year
    
    prompt = f"""You are an expert {doc_info['name']} analyzer. This document is CONFIRMED to be a {doc_info['name']}.

IMPORTANT CONTEXT:
- Today's date is: {current_date}
- Current year: {current_year}
- Documents dated BEFORE today are VALID historical records
- Documents dated AFTER today are suspicious and should be flagged

YOUR TASK:
Analyze this {doc_info['name']} and extract ALL relevant information with high precision.

REQUIRED FIELDS TO EXTRACT:
{fields_str}

AUTHENTICITY VERIFICATION:
Look for these markers: {markers_str}
{doc_info['analysis_focus']}

IMPORTANT RULES:
1. Only extract data that is actually present in the document
2. For dates: Use format YYYY-MM-DD if possible, otherwise keep original format
3. For amounts: Include currency symbol and full numeric value
4. For IDs/numbers: Extract exactly as shown
5. If a required field is not found, return "Not found" for that field
6. CRITICAL: When checking dates, compare them to TODAY'S DATE ({current_date}), NOT some past date
7. Calculate authenticity score (0-100) based on:
   - Presence of official markers (30 points)
   - Document quality and clarity (20 points)
   - Data consistency and completeness (30 points)
   - Professional formatting (20 points)

8. DATE VALIDATION RULES:
   - If a document is dated in the PAST (before {current_date}), this is NORMAL and VALID
   - Only flag dates as suspicious if they are AFTER {current_date} (future dates)
   - Example: A document from August 2025 is VALID if we are in November 2025 or later
   - Example: A document from December 2025 is SUSPICIOUS if we are in November 2025

OUTPUT FORMAT (MUST BE VALID JSON):
{{
    "document_type": "{doc_type}",
    "extracted_data": {{
        // All fields from the {doc_info['name']} as key-value pairs
        // Use the field names listed above
    }},
    "authenticity_score": 0-100,
    "authenticity_details": {{
        "official_markers_found": ["list of markers found"],
        "missing_markers": ["list of expected but missing markers"],
        "quality_assessment": "brief assessment"
    }},
    "verification_summary": "2-3 sentence summary of verification",
    "suspicious_elements": [
        "Only include items that are GENUINELY suspicious",
        "Do NOT flag past dates as suspicious - only FUTURE dates (after {current_date})",
        "Examples of real red flags: missing signatures, altered amounts, mismatched info"
    ],
    "confidence": 0-100,
    "extraction_notes": "Any important notes about the extraction"
}}

CRITICAL: Return ONLY valid JSON. No markdown, no explanations, just the JSON object."""
    
    return prompt

@app.route('/analyze_and_mint', methods=['POST'])
def analyze_and_mint():
    """Analyze document with focused AI analysis based on selected type"""
    
    # Validate request
    if 'document' not in request.files:
        return jsonify({"error": "No document part"}), 400
    
    document_file = request.files['document']
    recipient_address = request.form.get("owner_address")
    document_type = request.form.get("document_type", "invoice")  # Get selected type
    
    if document_file.filename == '':
        return jsonify({"error": "No selected document"}), 400
    
    if not recipient_address:
        return jsonify({"error": "No owner_address provided"}), 400
    
    if document_type not in DOCUMENT_TYPES:
        return jsonify({"error": f"Invalid document type: {document_type}"}), 400
    
    try:
        # Read document bytes
        document_bytes = document_file.read()

        # EXTRACT TEXT FROM PDF (Since we are using Text-Based Llama 3.3)
        extracted_text = ""
        try:
            # Check content type or filename
            if "pdf" in document_file.content_type.lower() or document_file.filename.lower().endswith('.pdf'):
                pdf_file = io.BytesIO(document_bytes)
                reader = PdfReader(pdf_file)
                for page in reader.pages:
                    text_content = page.extract_text()
                    if text_content:
                        extracted_text += text_content + "\n"
            else:
                # Fallback implementation or warning for non-PDFs
                # For images, we can't extract text without OCR libraries like Tesseract
                # But for the demo, we assume PDFs.
                extracted_text = "Non-PDF document provided. Analysis limited."
                
            if len(extracted_text) < 5:
                # If extraction fails or is empty
                extracted_text = "No machine-readable text found in document."
                
        except Exception as e:
            app.logger.error(f"Text extraction failed: {e}")
            extracted_text = "Error extracting text from document."

        # Get document info
        doc_info = DOCUMENT_TYPES[document_type]
        
        # Generate focused AI prompt
        prompt = generate_focused_prompt(document_type)
        
        app.logger.info(f"Analyzing {doc_info['name']}: {document_file.filename} using Llama 3.3")
        
        # Check Groq service
        if not groq_service or not groq_service.client:
             return jsonify({"error": "Groq Service unavailable"}), 503
        else:
            try:
                # ✅ NEW: Analyze Text with Llama 3.3
                response_text = groq_service.analyze_text(
                    text_content=extracted_text,
                    prompt=prompt
                )
                
                # Parse AI response
                response_text = response_text.strip()
                response_text = response_text.replace("```json", "").replace("```", "").strip()
                ai_report_json = json.loads(response_text)
                
                ai_report_json["ai_model"] = "Llama 3.3 70B (Groq)"

            except Exception as e:
                app.logger.error(f"Groq Analysis Failed: {e}")
                return jsonify({"error": f"AI Analysis Failed: {str(e)}"}), 500

        
        # Ensure document_type is set correctly
        ai_report_json["document_type"] = document_type
        
        # Post-process suspicious elements to remove false positives about past dates
        if "suspicious_elements" in ai_report_json:
            suspicious = ai_report_json["suspicious_elements"]
            if isinstance(suspicious, list):
                # Filter out any mentions of dates being "in the future" if they're actually in the past
                filtered_suspicious = []
                for item in suspicious:
                    if isinstance(item, str):
                        # Skip if it mentions future dates for dates that are clearly past
                        lower_item = item.lower()
                        if "future" in lower_item or "after" in lower_item:
                            # Check if it mentions a date
                            import re
                            # Look for dates in various formats
                            date_patterns = [
                                r'\d{2}\.\d{2}\.\d{4}',  # DD.MM.YYYY
                                r'\d{4}-\d{2}-\d{2}',    # YYYY-MM-DD
                                r'\d{2}/\d{2}/\d{4}',    # MM/DD/YYYY
                            ]
                            
                            has_date = any(re.search(pattern, item) for pattern in date_patterns)
                            if has_date:
                                # Extract year from the suspicious element
                                year_match = re.search(r'20\d{2}', item)
                                if year_match:
                                    doc_year = int(year_match.group())
                                    current_year = datetime.now().year
                                    # Only keep if document year is genuinely in the future
                                    if doc_year > current_year:
                                        filtered_suspicious.append(item)
                                    # Skip if document year is current or past
                                    continue
                        
                        # Keep all other suspicious elements
                        filtered_suspicious.append(item)
                
                ai_report_json["suspicious_elements"] = filtered_suspicious
        
        # QR Code verification
        qr_content = find_and_decode_qr(document_bytes, document_file.content_type)
        verification_method = "AI Analysis Only"
        if qr_content:
            verification_method = "✅ QR Code + AI Verified"
            app.logger.info(f"QR Code found: {qr_content}")
            ai_report_json["qr_code_content"] = qr_content
            # Boost authenticity score if QR code is present
            if "authenticity_score" in ai_report_json:
                ai_report_json["authenticity_score"] = min(100, ai_report_json["authenticity_score"] + 10)
        
        ai_report_json["verification_method"] = verification_method
        ai_report_json["verified_at"] = datetime.utcnow().isoformat()
        
        # Prepare enhanced NFT metadata
        nft_metadata = {
            "name": f"{doc_info['icon']} {doc_info['name']}: {document_file.filename}",
            "description": f"AI-verified {doc_info['name']} tokenized as RWA NFT with comprehensive verification report",
            "image": "https://gateway.pinata.cloud/ipfs/Qma5Fpw3Y2jL6vAacgEAA418f2f2KJEaJkkhq2tYmS3a1V",
            "attributes": [
                {"trait_type": "Document Type", "value": doc_info['name']},
                {"trait_type": "Verification Method", "value": verification_method},
                {"trait_type": "Authenticity Score", "value": str(ai_report_json.get("authenticity_score", 0))},
                {"trait_type": "Confidence", "value": str(ai_report_json.get("confidence", 0))},
                {"trait_type": "Verified Date", "value": datetime.utcnow().strftime("%Y-%m-%d")}
            ],
            "properties": {
                "ai_report": ai_report_json,
                "document_category": document_type,
                "verification_platform": "A.R.I.A. on QIE Blockchain",
                "ai_model": "Gemini 2.5 Pro"
            }
        }
        
        # Upload to IPFS
        app.logger.info("Uploading metadata to IPFS...")
        ipfs_url, ipfs_hash_only = upload_to_ipfs(nft_metadata)
        app.logger.info(f"IPFS upload successful: {ipfs_hash_only}")
        
        # Mint NFT on blockchain
        app.logger.info(f"Minting {doc_info['name']} NFT for {recipient_address}")
        tx_hash = BlockchainService.mint_nft(recipient_address, ipfs_hash_only)
        app.logger.info(f"Minting successful! Tx Hash: {tx_hash}")
        
        # Ensure tx_hash has 0x prefix
        if not tx_hash.startswith('0x'):
            tx_hash = '0x' + tx_hash
        
        return jsonify({
            "success": True,
            "txId": tx_hash,
            "document_type": document_type,
            "document_icon": doc_info['icon'],
            "document_name": doc_info['name'],
            "ai_report_display": ai_report_json,
            "ipfs_link": ipfs_url
        }), 200
        
    except json.JSONDecodeError as e:
        app.logger.error(f"Failed to parse AI response as JSON: {e}", exc_info=True)
        app.logger.error(f"AI Response was: {response_text}")
        return jsonify({"error": "AI returned invalid JSON response", "details": str(e)}), 500
    
    except Exception as e:
        app.logger.error(f"Error in /analyze_and_mint: {e}", exc_info=True)
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

@app.route('/oracle/price/<path:pair>', methods=['GET'])
def get_oracle_price(pair):

    """
    Get current oracle price for a trading pair
    
    Example: GET /oracle/price/ARIA/USD
    Returns: {"pair": "ARIA/USD", "price": 0.50, "timestamp": 1234567890}
    """
    try:
        price_data = OracleService.get_price_from_oracle(pair)
        
        if not price_data:
            return jsonify({
                "error": f"Price data not available for {pair}"
            }), 404
        
        return jsonify({
            "pair": price_data['pair'],
            "price": price_data['price'],
            "timestamp": price_data['timestamp'],
            "decimals": price_data['decimals']
        }), 200
        
    except Exception as e:
        print(f"Error fetching oracle price: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/oracle/nft-price/<int:token_id>', methods=['GET'])
def get_nft_live_price(token_id):
    """
    Get live price for an NFT listing (considering oracle)

    Example: GET /oracle/nft-price/5
    Returns:
    {
        "tokenId": 5,
        "staticPrice": 1000,
        "currentPrice": 950.25,
        "prices": {"USD": 475.12, "INR": 39594.00},
        "oracleEnabled": true,
        "useDynamicPricing": true,
        "priceInUSD": 475.12
    }
    """
    try:
        w3 = Web3(Web3.HTTPProvider(os.getenv("QIE_RPC_URL", "http://127.0.0.1:8545/")))
        marketplace = w3.eth.contract(address=ARIAMARKETPLACE_ADDRESS, abi=ARIAMARKETPLACE_ABI)

        try:
            # NEW contract returns 7 values
            listing_details = marketplace.functions.getListingDetails(token_id).call()

            (
                seller,
                static_price_wei,
                current_price_wei,
                name,
                use_dynamic,
                price_pair,
                price_in_usd_e8,
                disputed
            ) = listing_details

            static_price_tokens = static_price_wei / 1e18
            current_price_tokens = current_price_wei / 1e18

            # If USD-pegged, USD value is authoritative from contract
            if use_dynamic and price_in_usd_e8 > 0:
                price_in_usd = price_in_usd_e8 / 1e8
            else:
                price_in_usd = None  # fallback later
        
        except Exception as e:
            print(f"[Fallback listing] {e}")
            listing = marketplace.functions.listings(token_id).call()
            
            seller = listing[0]
            static_price_wei = listing[1]
            static_price_tokens = static_price_wei / 1e18
            current_price_tokens = static_price_tokens  # no oracle baseline
            
            use_dynamic = False
            price_in_usd = None
        
        oracle_enabled = marketplace.functions.useOracle().call()

        # Convert ARIA current → USD/INR/etc
        prices = OracleService.get_nft_price_in_currencies(current_price_tokens)

        # If price_in_usd was missing, fallback to computed USD
        if price_in_usd is None:
            price_in_usd = prices.get("USD", 0)

        return jsonify({
            "tokenId": token_id,
            "staticPrice": static_price_tokens,
            "currentPrice": current_price_tokens,
            "prices": prices,
            "oracleEnabled": oracle_enabled,
            "useDynamicPricing": use_dynamic,
            "priceInUSD": price_in_usd,
            "name": name if 'name' in locals() else None,
            "seller": seller
        }), 200

    except Exception as e:
        print(f"Error fetching NFT live price: {e}")
        return jsonify({"error": str(e)}), 500



@app.route('/oracle/convert', methods=['POST'])
def convert_currency():
    """
    Convert amount from one currency to another
    
    POST /oracle/convert
    Body: {"amount": 1000, "from": "INR", "to": "USD"}
    Returns: {"amount": 1000, "from": "INR", "to": "USD", "result": 12.00}
    """
    try:
        data = request.get_json()
        amount = float(data.get('amount', 0))
        from_currency = data.get('from', 'USD')
        to_currency = data.get('to', 'USD')
        
        if amount <= 0:
            return jsonify({"error": "Amount must be positive"}), 400
        
        result = OracleService.convert_currency(amount, from_currency, to_currency)
        
        if result is None:
            return jsonify({
                "error": f"Cannot convert {from_currency} to {to_currency}"
            }), 400
        
        return jsonify({
            "amount": amount,
            "from": from_currency,
            "to": to_currency,
            "result": result
        }), 200
        
    except Exception as e:
        print(f"Currency conversion error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/oracle/property-value', methods=['POST'])
def update_property_value():
    """
    Update property value based on real estate index
    
    POST /oracle/property-value
    Body: {"originalValue": 100000}
    Returns: {"originalValue": 100000, "updatedValue": 105000, "multiplier": 1.05}
    """
    try:
        data = request.get_json()
        original_value = float(data.get('originalValue', 0))
        
        if original_value <= 0:
            return jsonify({"error": "Value must be positive"}), 400
        
        updated_value = OracleService.apply_real_estate_multiplier(original_value)
        multiplier = updated_value / original_value
        
        return jsonify({
            "originalValue": original_value,
            "updatedValue": updated_value,
            "multiplier": multiplier,
            "change": ((multiplier - 1) * 100)
        }), 200
        
    except Exception as e:
        print(f"Property value update error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/oracle/batch-prices', methods=['POST'])
def get_batch_prices():
    """
    Get multiple oracle prices in one request
    
    POST /oracle/batch-prices
    Body: {"pairs": ["ARIA/USD", "ETH/USD", "INR/USD"]}
    Returns: {"prices": {"ARIA/USD": {...}, "ETH/USD": {...}}}
    """
    try:
        data = request.get_json()
        pairs = data.get('pairs', [])
        
        if not pairs:
            return jsonify({"error": "No pairs specified"}), 400
        
        results = OracleService.get_live_prices_batch(pairs)
        
        return jsonify({
            "prices": results,
            "timestamp": int(time.time())
        }), 200
        
    except Exception as e:
        print(f"Batch price fetch error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/oracle/clear-cache', methods=['POST'])
def clear_oracle_cache():
    """
    Clear the oracle price cache (force refresh)
    
    POST /oracle/clear-cache
    Returns: {"message": "Cache cleared"}
    """
    try:
        OracleService.clear_cache()
        return jsonify({"message": "Oracle cache cleared successfully"}), 200
    except Exception as e:
        print(f"Cache clear error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/oracle/status', methods=['GET'])
def oracle_status():
    """
    Get oracle service status and configuration
    
    GET /oracle/status
    Returns: {
        "enabled": true,
        "cacheSize": 4,
        "cacheTTL": 30,
        "availablePairs": [...]
    }
    """
    try:
        return jsonify({
            "enabled": True,
            "cacheSize": len(OracleService.price_cache),
            "cacheTTL": OracleService.CACHE_TTL,
            "availablePairs": [
                "ARIA/USD",
                "ETH/USD",
                "INR/USD",
                "RE_INDEX"
            ],
            "provider": OracleService.PROVIDER_URL
        }), 200
    except Exception as e:
        print(f"Status check error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/supported_documents', methods=['GET'])
def get_supported_documents():
    """Return list of supported document types with metadata"""
    return jsonify({
        "supported_types": [
            {
                "type": doc_type,
                "name": info["name"],
                "icon": info["icon"],
                "fields": info["fields"],
                "authenticity_markers": info["authenticity_markers"]
            }
            for doc_type, info in DOCUMENT_TYPES.items()
        ]
    }), 200

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "ok", 
        "message": "ARIA backend is running",
        "supported_documents": len(DOCUMENT_TYPES),
        "ai_model": "Gemini 2.5 Pro"
    }), 200

if __name__ == '__main__':
    app.run(debug=True, port=5001)