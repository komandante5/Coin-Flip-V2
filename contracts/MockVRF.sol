// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IVRFSystem, IVRFSystemCallback} from "./IVRF.sol";

contract MockVRF is IVRFSystem {
    uint256 private requestIdCounter = 1;
    
    mapping(uint256 => bool) public requestExists;
    
    event RandomNumberRequested(uint256 requestId, uint256 traceId);
    event CallbackTriggered(address target, uint256 requestId, uint256 randomNumber);
    
    function requestRandomNumberWithTraceId(uint256 traceId) external returns (uint256) {
        uint256 requestId = requestIdCounter++;
        requestExists[requestId] = true;
        
        emit RandomNumberRequested(requestId, traceId);
        
        return requestId;
    }
    
    // Helper function for testing - allows manual triggering of callbacks
    function triggerCallback(
        address target, 
        uint256 requestId, 
        uint256 randomNumber
    ) external {
        require(requestExists[requestId], "Request does not exist");
        
        emit CallbackTriggered(target, requestId, randomNumber);
        
        IVRFSystemCallback(target).randomNumberCallback(requestId, randomNumber);
    }
    
    // Helper function to get the next request ID (for testing)
    function getNextRequestId() external view returns (uint256) {
        return requestIdCounter;
    }
}
