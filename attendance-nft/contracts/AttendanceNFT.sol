// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract AttendanceNFT is ERC721 {
    using Strings for uint256;

    uint256 private _currentTokenId;
    string private _baseTokenURI;

    mapping(uint256 => string) private _tokenMetadata;

    constructor() ERC721("AttendanceNFT", "ANFT") {
        _baseTokenURI = ""; // Default empty string
    }

    function mintAttendance(address recipient, string memory metadata) public returns (uint256) {
        _currentTokenId++;
        uint256 newItemId = _currentTokenId;
        _mint(recipient, newItemId);
        _tokenMetadata[newItemId] = metadata;
        return newItemId;
    }

    function getTokenMetadata(uint256 tokenId) public view returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        return _tokenMetadata[tokenId];
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        return string(abi.encodePacked(_baseTokenURI, tokenId.toString()));
    }

    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    function setBaseTokenURI(string memory baseTokenURI) public {
        _baseTokenURI = baseTokenURI;
    }
}