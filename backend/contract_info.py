# backend/contract_info.py
import json
import os

# --- DEPLOYED CONTRACT ADDRESSES ---
ARIANFT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
ARIATOKEN_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
ARIAMARKETPLACE_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"

# --- DYNAMIC ABI LOADING ---

def load_abi(contract_filename: str) -> list:
    """
    Loads a contract's ABI from its Hardhat artifact file.
    Assumes this script is in 'backend/' and artifacts are in '../contracts-hardhat/artifacts/'.
    """
    try:
        # Construct the relative path to the artifact file
        artifact_path = os.path.join(
            os.path.dirname(__file__),
            '..',
            'contracts',
            'artifacts',
            'contracts',
            contract_filename
        )

        with open(artifact_path, 'r') as f:
            artifact = json.load(f)
            return artifact['abi']

    except FileNotFoundError:
        print(f"ERROR: Artifact file not found at {artifact_path}")
        print("Please ensure your monorepo structure is correct ('backend' and 'contracts-hardhat' are sibling folders) and that you have compiled your contracts.")
        raise
    except KeyError:
        print(f"ERROR: 'abi' key not found in {artifact_path}. The artifact file may be corrupted.")
        raise

# Load the ABIs from their respective .sol.json files
ARIANFT_ABI = load_abi('AriaNFT.sol/AriaNFT.json')
ARIATOKEN_ABI = load_abi('AriaToken.sol/AriaToken.json')
ARIAMARKETPLACE_ABI = load_abi('AriaMarketplace.sol/AriaMarketplace.json')

print("Successfully loaded contract ABIs from artifact files.")