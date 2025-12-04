// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title QIEOracleTestnet
 * @notice AggregatorV3-compatible oracle for QIE Testnet
 * @dev Implements Chainlink's AggregatorV3Interface for compatibility
 *
 * This oracle is deployed on QIE Testnet because official QIE Oracles
 * are only on mainnet. It follows the exact same interface as real
 * QIE/Chainlink oracles for seamless mainnet migration.
 */
contract QIEOracleTestnet is AggregatorV3Interface, Ownable {
    struct RoundData {
        int256 answer;
        uint256 startedAt;
        uint256 updatedAt;
        uint80 answeredInRound;
    }

    // Storage
    mapping(uint80 => RoundData) public rounds;
    uint80 public latestRound;

    uint8 public override decimals;
    string public override description;
    uint256 public override version;

    event AnswerUpdated(
        int256 indexed current,
        uint256 indexed roundId,
        uint256 updatedAt
    );

    constructor(string memory _description, uint8 _decimals) Ownable() {
        description = _description;
        decimals = _decimals;
        version = 1;
        latestRound = 0;
    }

    /**
     * @notice Update the oracle price (owner only)
     * @param _answer The new price (scaled by decimals)
     */
    function updateAnswer(int256 _answer) external onlyOwner {
        latestRound++;

        rounds[latestRound] = RoundData({
            answer: _answer,
            startedAt: block.timestamp,
            updatedAt: block.timestamp,
            answeredInRound: latestRound
        });

        emit AnswerUpdated(_answer, latestRound, block.timestamp);
    }

    /**
     * @notice Get data from the latest round
     * @return roundId The round ID
     * @return answer The price
     * @return startedAt When the round started
     * @return updatedAt When the round was updated
     * @return answeredInRound The round ID in which the answer was computed
     */
    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        require(latestRound > 0, "No data present");

        RoundData memory data = rounds[latestRound];

        return (
            latestRound,
            data.answer,
            data.startedAt,
            data.updatedAt,
            data.answeredInRound
        );
    }

    /**
     * @notice Get data from a specific round
     * @param _roundId The round ID
     */
    function getRoundData(
        uint80 _roundId
    )
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        require(_roundId > 0 && _roundId <= latestRound, "Invalid round");

        RoundData memory data = rounds[_roundId];

        return (
            _roundId,
            data.answer,
            data.startedAt,
            data.updatedAt,
            data.answeredInRound
        );
    }
}
