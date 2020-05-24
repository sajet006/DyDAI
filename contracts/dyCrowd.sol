pragma solidity 0.5.12;
pragma experimental ABIEncoderV2;
import "./DyDAI.sol";

library Account {
    struct Info {
        address owner;
        uint256 number;
    }
}

library Types {
    struct Wei {
        bool sign; // true if positive
        uint256 value;
    }

    enum AssetDenomination {
        Wei, // the amount is denominated in wei
        Par  // the amount is denominated in par
    }

    enum AssetReference {
        Delta, // the amount is given as a delta from the current value
        Target // the amount is given as an exact number to end up at
    }

    struct AssetAmount {
        bool sign; // true if positive
        AssetDenomination denomination;
        AssetReference ref;
        uint256 value;
    }
}

library Actions {
    enum ActionType {
        Deposit,   // supply tokens
        Withdraw  // borrow tokens TODO why comment is borrow?
    }

    struct ActionArgs {
        ActionType actionType;
        uint256 accountId;
        Types.AssetAmount amount;
        uint256 primaryMarketId;
        uint256 secondaryMarketId;
        address otherAddress;
        uint256 otherAccountId;
        bytes data;
    }
}

contract SoloMargin {
    struct OperatorArg {
        address operator;
        bool trusted;
    }
    
    function operate(Account.Info[] memory accounts, Actions.ActionArgs[] memory actions) public;
    function getAccountWei(Account.Info memory account, uint256 marketId) public view returns (Types.Wei memory);
    function setOperators(OperatorArg[] memory args) public;
    
    function getMarketTokenAddress(
        uint256 marketId
    )
        public
        view
        returns (address);
    
    function getIsLocalOperator(
        address owner,
        address operator
    )
        public
        view
        returns (bool);
}

library Address {
    /**
     * @dev Returns true if `account` is a contract.
     *
     * [IMPORTANT]
     * ====
     * It is unsafe to assume that an address for which this function returns
     * false is an externally-owned account (EOA) and not a contract.
     *
     * Among others, `isContract` will return false for the following
     * types of addresses:
     *
     *  - an externally-owned account
     *  - a contract in construction
     *  - an address where a contract will be created
     *  - an address where a contract lived, but was destroyed
     * ====
     */
    function isContract(address account) internal view returns (bool) {
        // According to EIP-1052, 0x0 is the value returned for not-yet created accounts
        // and 0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470 is returned
        // for accounts without code, i.e. `keccak256('')`
        bytes32 codehash;
        bytes32 accountHash = 0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470;
        // solhint-disable-next-line no-inline-assembly
        assembly { codehash := extcodehash(account) }
        return (codehash != accountHash && codehash != 0x0);
    }

    /**
     * @dev Replacement for Solidity's `transfer`: sends `amount` wei to
     * `recipient`, forwarding all available gas and reverting on errors.
     *
     * https://eips.ethereum.org/EIPS/eip-1884[EIP1884] increases the gas cost
     * of certain opcodes, possibly making contracts go over the 2300 gas limit
     * imposed by `transfer`, making them unable to receive funds via
     * `transfer`. {sendValue} removes this limitation.
     *
     * https://diligence.consensys.net/posts/2019/09/stop-using-soliditys-transfer-now/[Learn more].
     *
     * IMPORTANT: because control is transferred to `recipient`, care must be
     * taken to not create reentrancy vulnerabilities. Consider using
     * {ReentrancyGuard} or the
     * https://solidity.readthedocs.io/en/v0.5.11/security-considerations.html#use-the-checks-effects-interactions-pattern[checks-effects-interactions pattern].
     */
    function sendValue(address payable recipient, uint256 amount) internal {
        require(address(this).balance >= amount, "Address: insufficient balance");

        // solhint-disable-next-line avoid-low-level-calls, avoid-call-value
        (bool success, ) = recipient.call.value(amount)("");
        require(success, "Address: unable to send value, recipient may have reverted");
    }
}

library SafeERC20 {
    using SafeMath for uint256;
    using Address for address;

    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeWithSelector(token.transfer.selector, to, value));
    }

    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeWithSelector(token.transferFrom.selector, from, to, value));
    }

    function safeApprove(IERC20 token, address spender, uint256 value) internal {
        // safeApprove should only be called when setting an initial allowance,
        // or when resetting it to zero. To increase and decrease it, use
        // 'safeIncreaseAllowance' and 'safeDecreaseAllowance'
        // solhint-disable-next-line max-line-length
        require((value == 0) || (token.allowance(address(this), spender) == 0),
            "SafeERC20: approve from non-zero to non-zero allowance"
        );
        _callOptionalReturn(token, abi.encodeWithSelector(token.approve.selector, spender, value));
    }

    function safeIncreaseAllowance(IERC20 token, address spender, uint256 value) internal {
        uint256 newAllowance = token.allowance(address(this), spender).add(value);
        _callOptionalReturn(token, abi.encodeWithSelector(token.approve.selector, spender, newAllowance));
    }

    function safeDecreaseAllowance(IERC20 token, address spender, uint256 value) internal {
        uint256 newAllowance = token.allowance(address(this), spender).sub(value, "SafeERC20: decreased allowance below zero");
        _callOptionalReturn(token, abi.encodeWithSelector(token.approve.selector, spender, newAllowance));
    }

    /**
     * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token The token targeted by the call.
     * @param data The call data (encoded using abi.encode or one of its variants).
     */
    function _callOptionalReturn(IERC20 token, bytes memory data) private {
        // We need to perform a low level call here, to bypass Solidity's return data size checking mechanism, since
        // we're implementing it ourselves.

        // A Solidity high level call has three parts:
        //  1. The target address is checked to verify it contains contract code
        //  2. The call itself is made, and success asserted
        //  3. The return value is decoded, which in turn checks the size of the returned data.
        // solhint-disable-next-line max-line-length
        require(address(token).isContract(), "SafeERC20: call to non-contract");

        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returndata) = address(token).call(data);
        require(success, "SafeERC20: low-level call failed");

        if (returndata.length > 0) { // Return data is optional
            // solhint-disable-next-line max-line-length
            require(abi.decode(returndata, (bool)), "SafeERC20: ERC20 operation did not succeed");
        }
    }
}

contract DyCrowd {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // The token being sold
    DyDAI internal DyDAItoken;
    address internal sm;
    ERC20 internal DAIToken;
    
    Account.Info[] internal accounts;
    Actions.ActionArgs[] internal actions;
  
    uint256 private _rate=1000000000000000000; //1 decimals 18
    
    address public  owner;

    modifier onlyOwner() {
        require (msg.sender == owner);
        _;
    }

    event TokensPurchased(address  purchaser, uint256 DAIAmount, uint256 DyDAItokenamount);
    event TokensSold(address Withdrawee,uint256 DyDAItokenamount,uint256 DAIAmount);


    constructor (address DyDAItokenAddr,address DAITokenAddr,address soloMargin) public {
        owner = msg.sender;
        require(soloMargin != address(0), "soloMargin is the zero address");
        require(DyDAItokenAddr != address(0), "DyDAItoken is the zero address");
        require(DAITokenAddr != address(0), "DAIToken is the zero address");
        sm=soloMargin;
        DyDAItoken = DyDAI(DyDAItokenAddr);
        DAIToken = ERC20(DAITokenAddr);
    }

    function token() public view returns (address) {
        return address(DyDAItoken);
    }

    function rate() public view returns (uint256) {
        return _rate;
    }
    
    function updateRate() public {
        uint256 totalDyDAISupply=totalDyDAIMinted();
        uint256 totalDAIBalance=contractDAIBalance();
        if(totalDyDAISupply>0 && totalDAIBalance>0){
           _rate=(totalDAIBalance.mul(10**18)).div(totalDyDAISupply);
        }
        rate();
    }
    
    function totalDyDAIMinted() public view returns(uint256){
        return DyDAItoken.totalSupply();
    }
    
    function contractDAIBalance() public view returns(uint256){
         Account.Info memory contractAccount =Account.Info({
            owner:address(this),
            number:0
        });
        return SoloMargin(sm).getAccountWei(contractAccount,1).value;
    }

    function _preValidateData(address beneficiary, uint256 Amount) internal pure 
    {
        require(beneficiary != address(0), "Beneficiary is the zero address");
        require(Amount != 0, "Amount is 0");
    }
    
    function buyTokens(uint256 DAIAmount) public   
    {
        address sender= msg.sender;
        _preValidateData(sender,DAIAmount);
        require(DAIToken.balanceOf(sender)>=DAIAmount,"Insufficient Balance");
        DAIToken.transferFrom(sender,address(this),DAIAmount);
        DAIToken.approve(sm,DAIAmount);
        uint256 allowance = DAIToken.allowance(address(this), sm);
        require(allowance>=DAIAmount,"Contract not allowed to spend required DAI Amount");
        
        // calculate token amount to be minted
        updateRate();
        uint256 tokens = (DAIAmount.mul(10**18)).div(_rate);

        operate(address(this),DAIAmount,true);
        require(ERC20Mintable(address(token())).mint(sender, tokens),"Minting failed"); //Minting DyDAI Token
        emit TokensPurchased(sender, DAIAmount, tokens);
    }
    
    
    function sellTokens(uint256 tokenAmount) public 
    {
        address sender= msg.sender;
        _preValidateData(sender,tokenAmount);
        require(DyDAItoken.balanceOf(sender)>=tokenAmount,"Insufficient Balance");
        uint256 burnallowance = DyDAItoken.allowance(sender, address(this));
        require(burnallowance>=tokenAmount,"Insufficient Burn Allowance");
        updateRate();
        DyDAItoken.burnFrom(sender,tokenAmount);
        uint256 initialDAIAmount=(tokenAmount.mul(_rate)).div(10**18);// calculate dai amount to be return
        operate(address(this),initialDAIAmount,false);
        uint256 finalDAIAmount=(initialDAIAmount.div(1000)).mul(995);//returning dai to user after deducting 0.5% fees
        DAIToken.transfer(sender,finalDAIAmount);
        emit TokensSold(sender,tokenAmount, initialDAIAmount);
    }

    function operate(address user, uint256 amount, bool isDeposit) internal
    {
        bytes memory data;
        Account.Info memory account =Account.Info({
            owner:user,
            number:0
        });
        Actions.ActionArgs memory action = Actions.ActionArgs({
            actionType: isDeposit ? Actions.ActionType.Deposit : Actions.ActionType.Withdraw,
            amount: Types.AssetAmount({
                sign: isDeposit,
                denomination: Types.AssetDenomination.Wei,
                ref: Types.AssetReference.Delta,
                value: amount
            }),
            primaryMarketId: 1,
            otherAddress: user,
            accountId: 0,
            secondaryMarketId: 0,
            otherAccountId: 0,
            data: data
        });

        if (accounts.length > 0) {
            accounts[0] = account;
            actions[0] = action;
        } else {
            accounts.push(account);
            actions.push(action);
        }

        SoloMargin(sm).operate(accounts, actions);
    }
    
    function withdrawDAI() onlyOwner public returns(bool) 
    {
        uint256 Balance=DAIToken.balanceOf(address(this));
        require(Balance>0);
        DAIToken.transfer(owner,Balance);
        return true;
    }
}