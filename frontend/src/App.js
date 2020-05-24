import React, { Component } from 'react';
import './App.css';
import WidgetBot from '@widgetbot/react-embed';
import Web3 from 'web3';
import DyCrowdInstance from './DyCrowd';
import DyDAIInstance from './DyDAI';
import DAITokenInstance from './DAIToken';
import metamaskSvg from './metamask.svg';
import {
	Box,
	Card,
	Flex,
	Button,
	Input,
	MetaMaskButton,
	Text,
	ToastMessage,
	Flash,
	Heading,
	Image
} from 'rimble-ui';
import { createApolloFetch } from 'apollo-fetch';
import { Warning } from '@rimble/icons';
import MediaQuery from 'react-responsive';

class App extends Component {
	state = {
		dyDAISupply: 0,
		totalDAIBalance: 0,
		account: '0x00',
		userDAIBalance: 0,
		userDyDAIBalance: 0,
		rate: 1,
		enteredAmount: 0,
		message: ' ',
		daiLocked: 0,
		supplyRate: 0,
		daiRate: 0,
		dyDaiToDaiState: false,
		daiToDyDaiState: true,
		txFailed: false,
		txProcessing: false,
		txSuccess: false,
		dyDaiRate: 0,
		discordWidget: false,
		metamaskInstalled: false
	};

	async componentDidMount() {
		// Detect Metamask
		const metamaskInstalled = typeof window.web3 !== 'undefined';
		this.setState({ metamaskInstalled });
		if (metamaskInstalled) {
			await this.loadWeb3();
			await this.loadBlockchainData();
		} else {
			console.log(this.state.metamaskInstalled);
		}
		// get interest rate
		const fetch = createApolloFetch({
			uri: 'https://api.thegraph.com/subgraphs/name/graphitetools/dydx'
		});
		fetch({
			query: '{ tokens(first: 4) { id address } markets(first: 5) { id token { id } supplyRate borrowIndex } }'
		}).then((res) => {
			let rawSupplyRate = res.data.markets[res.data.markets.length - 1].supplyRate;
			let rawSupplyRateNum = +rawSupplyRate;
			let treatedSupplyRate =
				rawSupplyRate.length === 17 ? rawSupplyRateNum * Math.pow(10, 16) : rawSupplyRateNum * Math.pow(10, 17);
			let strSupplyRate = treatedSupplyRate + '';
			let supplyRate = strSupplyRate.slice(0, 4);
			this.setState({ supplyRate });
		});
	}

	async loadWeb3() {
		if (window.ethereum) {
			window.web3 = new Web3(window.ethereum);
			await window.ethereum.enable();
		} else if (window.web3) {
			window.web3 = new Web3(window.web3.currentProvider);
		}
	}

	async loadBlockchainData() {
		const web3 = window.web3;
		// Load account
		const dyDAISupply = this.roundOff(await DyCrowdInstance.methods.totalDyDAIMinted().call());
		const totalDAIBalance = this.roundOff(await DyCrowdInstance.methods.contractDAIBalance().call());
		const accounts = await web3.eth.getAccounts();
		this.setState({ dyDAISupply, totalDAIBalance, account: accounts[0] });
		const userDAIBalance = this.roundOff(await DAITokenInstance.methods.balanceOf(accounts[0]).call());
		const userDyDAIBalance = this.roundOff(await DyDAIInstance.methods.balanceOf(accounts[0]).call());
		if (totalDAIBalance !== 0 || dyDAISupply !== 0) {
			const rate = (totalDAIBalance / dyDAISupply).toFixed(4);
			this.setState({ rate });
		}
		const daiLocked = (this.state.rate * userDyDAIBalance).toFixed(4);
		this.setState({ userDAIBalance, userDyDAIBalance, daiLocked });
		const networkId = await web3.eth.net.getId();
		if (networkId !== 42) {
			window.alert('dyCrowd contract not deployed to detected network.');
		}
	}

	roundOff(num) {
		if (Number.isInteger(num) || num === 0) {
			return Number(num);
		} else {
			return Number((num * 10 ** -18).toFixed(4));
		}
	}

	DAIToDyDai = async (event) => {
		const web3 = window.web3;
		
		event.preventDefault();
		this.setState({ message: 'Waiting for transaction to be confirmed...', txProcessing: true });
		window.toastProvider.addMessage('Processing payment...', {
			secondaryMessage: 'Continue transacting in your wallet',
			actionHref:
				'',
			actionText: 'Check',
			variant: 'processing'
		})
		await DAITokenInstance.methods
			.approve(DyCrowdInstance.options.address, web3.utils.toWei(this.state.enteredAmount, 'ether'))
			.send({
				from: this.state.account
			});
		this.setState({ message: 'DAI approved successfully', txSuccess: true });
		window.toastProvider.addMessage('DAI Approved successfully...', {
			secondaryMessage: 'Check transaction details in your wallet',
			actionHref:
				'',
			actionText: 'Check',
			variant: 'success'
		})
		await DyCrowdInstance.methods.buyTokens(web3.utils.toWei(this.state.enteredAmount, 'ether')).send({
			from: this.state.account
		});
		this.setState({ message: 'You have converted you assets successfully', txSuccess: true });
	};

	DyDAIToDai = async (event) => {
		const web3 = window.web3;
		event.preventDefault();
		this.setState({ message: 'Waiting for transaction to be confirmed...', txSuccess: true });
		await DyDAIInstance.methods
			.approve(DyCrowdInstance.options.address, web3.utils.toWei(this.state.enteredAmount, 'ether'))
			.send({
				from: this.state.account
			});
		this.setState({ message: 'DyDAI Burn approved successfully', txSuccess: true });
		await DyCrowdInstance.methods.sellTokens(web3.utils.toWei(this.state.enteredAmount, 'ether')).send({
			from: this.state.account
		});
		this.setState({ message: 'You have converted you assets successfully', txSuccess: true });
	};

	onWithdraw = async (event) => {
		event.preventDefault();
		this.setState({ message: 'Waiting for transaction to be confirmed...', txProcessing: true });
		await DyCrowdInstance.methods.withdrawDAI().send({
			from: this.state.account
		});
		this.setState({ message: 'You have withdrawn successfully' });
	};

	handleDAItoDyDAI() {
		if (!this.state.daiToDyDaiState) {
			this.setState({ daiToDyDaiState: !this.state.daiToDyDaiState });
			this.setState({ dyDaiToDaiState: !this.state.dyDaiToDaiState });
		}
	}

	handleDyDAItoDAI() {
		if (this.state.daiToDyDaiState) {
			this.setState({ dyDaiToDaiState: !this.state.dyDaiToDaiState });
			this.setState({ daiToDyDaiState: !this.state.daiToDyDaiState });
		}
	}

	showWidget() {
		this.setState({ discordWidget: !this.state.discordWidget });
	}

	render() {
		// render appropriate toasts for processing/success transactions
		let message = <ToastMessage.Provider ref={(node) => (window.toastProvider = node)} />;
		// render convo buttons
		let convButton;
		if (Number(this.state.enteredAmount) !== 0 && this.state.enteredAmount <= this.state.userDAIBalance) {
			if (this.state.daiToDyDaiState) {
				convButton = (
					<div>
						<ToastMessage.Provider ref={(node) => (window.toastProvider = node)} />
						<Button style={{ marginTop: '2px', marginLeft: '72px' }} onClick={e => this.DAIToDyDai(e)}>
							Convert
						</Button>
					</div>
				);
			} else {
				convButton = (
					<Button style={{ marginTop: '2px', marginLeft: '72px' }} onClick={this.DyDAIToDai}>
						Convert
					</Button>
				);
			}
		} else {
			convButton = (
				<Button style={{ marginTop: '2px', marginLeft: '72px' }} disabled>
					Convert
				</Button>
			);
		}
		return (
			<div className="App">
				<header className="App-header">
					<div className="main-nav">
						<div>
							<a href="/">
								{' '}
								<Text
									style={{ fontWeight: 600, textAlign: 'center', marginBottom: '20px', fontSize: 23 }}
									fontFamily="sansSerif"
								>
									{' '}
									DyDAI{' '}
								</Text>
							</a>
						</div>
					</div>
					<div />
					<div>
						{this.state.account !== '0x00' ? (
							<p style={{ color: 'white' }}>Connected Account: {this.state.account}</p>
						) : (
							<MetaMaskButton.Outline className="metamask">Connect with MetaMask</MetaMaskButton.Outline>
						)}
					</div>
				</header>
				<div className="purple-bar" />
				<Flash variant="info" className="info" style={{ textAlign: 'center', marginTop: '0px' }}>
					{' '}
					<Text>In beta version, use at your own risk! Smart contracts are audited by MythX</Text>
				</Flash>
				<MediaQuery maxDeviceWidth={1000}>
					<Flash variant="danger" className="info-mobile" style={{ textAlign: 'center', marginTop: '0px' }}>
						{' '}
						<Warning />
						<Text>
							Your browser doesn't support our blockchain features, try a mobile browser like Status,
							Coinbase Wallet or Cipher
						</Text>
					</Flash>
				</MediaQuery>
				{message}
				{!this.state.metamaskInstalled ? (
					<Card className="no-metamask" p={0} borderRadius={1}>
						<Flex
							justifyContent="space-between"
							alignItems="center"
							borderBottom={1}
							borderColor="near-white"
							p={[ 3, 4 ]}
							pb={3}
						>
							<Image src={metamaskSvg} aria-label="MetaMask extension icon" size="24px" />
							<Heading textAlign="center" as="h1" fontSize={[ 2, 3 ]} px={[ 3, 0 ]}>
								Install MetaMask to use DyDai
							</Heading>
						</Flex>
						<Box p={[ 3, 4 ]}>
							<Text mb={4}>
								MetaMask is a browser extension that will let you use our blockchain features in this
								browser. It may take you a few minutes to set up your MetaMask account.
							</Text>
						</Box>
						<Flex justifyContent="flex-end" borderTop={1} borderColor="light-gray" p={[ 3, 4 ]}>
							<a href="https://metamask.io/download.html" target="_blank" rel="noopener noreferrer">
								<MetaMaskButton width={[ '100%', 'auto' ]}>Install MetaMask</MetaMaskButton>
							</a>
						</Flex>
					</Card>
				) : (
					<div className="content">
						<Box
							className="rectangle-card"
							bg="white"
							color="#4E3FCE"
							fontSize={4}
							p={3}
							style={{
								height: '147px',
								width: '70%',
								marginTop: '5.3%',
								border: '1px solid #D6D6D6',
								boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.1)'
							}}
							width={[ 1, 1, 0.5 ]}
						>
							<div className="box-contents">
								<div className="total-supply">
									<Text style={{ fontWeight: 600 }} fontFamily="sansSerif">
										<p>Total DyDAI Supply</p>
									</Text>
									<Text style={{ color: 'black', fontSize: '17px' }}>
										<b>{this.state.dyDAISupply} DyDAI</b>
									</Text>
								</div>
								<div className="total-DAI">
									<Text style={{ fontWeight: 600 }} fontFamily="sansSerif">
										<p>Total DAI Locked up in DyDx</p>
									</Text>

									<Text style={{ color: 'black', fontSize: '17px', marginLeft: '55px' }}>
										<b>{this.state.totalDAIBalance} DAI</b>
									</Text>
								</div>

								<div className="interest-rate">
									<Text style={{ fontWeight: 600 }} fontFamily="sansSerif">
										<p>DAI Interest Rate</p>
									</Text>
									<Text style={{ color: 'black', fontSize: '17px', marginLeft: '30px' }}>
										<b>{this.state.supplyRate} %</b>
									</Text>
								</div>
							</div>
						</Box>

						<Flex style={{ marginTop: '20px' }}>
							<div className="conversion-card">
								<div className="toggle-buttons">
									<Button.Outline
										className={
											this.state.daiToDyDaiState ? 'buttonDAI2DyDai-blue' : 'buttonDAI2DyDai'
										}
										onClick={this.handleDAItoDyDAI.bind(this)}
										style={{ maxWidth: '175px' }}
									>
										DAI to DyDAI
									</Button.Outline>
									<Button.Outline
										className={
											this.state.dyDaiToDaiState ? 'buttonDyDAI2Dai-blue' : 'buttonDAI2Dai'
										}
										onClick={this.handleDyDAItoDAI.bind(this)}
										style={{ width: '184px' }}
									>
										DyDAI to DAI
									</Button.Outline>
								</div>
								<Card
									className="balance-card"
									bg="white"
									color="#4E3FCE"
									style={{
										border: '1px solid #D6D6D6',
										boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.1)',
										marginRight: '50px'
									}}
									maxWidth={'350px'}
									maxHeight={'350px'}
								>
									<span style={{ color: 'black', fontSize: '13px' }}>
										{' '}
										<b>
											{' '}
											{`Start saving by converting ${this.state.daiToDyDaiState
												? 'DAI to DyDAI'
												: 'DyDAI to DAI'}`}{' '}
										</b>
									</span>
									<div style={{ marginTop: '30px' }}>
										<span
											className=""
											style={{ textAlign: 'left', color: 'black', fontSize: '12px' }}
										>
											{`Amount ${this.state.daiToDyDaiState ? 'DAI' : 'DyDAI'}`}{' '}
										</span>
										<span
											style={{
												textAlign: 'right',
												color: 'black',
												fontSize: '12px',
												marginLeft: `${this.state.daiToDyDaiState ? '95px' : '75px'}`
											}}
										>
											{this.state.daiToDyDaiState ? (
												`DAI balance: ${this.state.userDAIBalance}`
											) : (
												`DyDAI balance: ${this.state.userDyDAIBalance}`
											)}
										</span>
									</div>
									<Input
										style={{ marginBottom: '15px', width: '280px' }}
										type="number"
										required={true}
										placeholder="Enter Amount"
										enteredAmount={this.state.enteredAmount}
										onChange={(event) =>
											this.setState({
												enteredAmount: event.target.value,
												dyDaiRate: (event.target.value / this.state.rate).toFixed(4),
												daiRate: (event.target.value * this.state.rate).toFixed(4)
											})}
									/>
									{convButton}
									<span
										style={{
											color: 'black',
											fontSize: '13px',
											textAlign: 'center',
											marginBottom: '12px'
										}}
									>
										{' '}
										{this.state.daiToDyDaiState ? (
											<p>You’ll receive about {this.state.dyDaiRate} DyDAI </p>
										) : (
											<p> You’ll receive about {this.state.daiRate} DAI </p>
										)}
									</span>
								</Card>
							</div>
							<Card
								bg="white"
								className="balance-card"
								color="#4E3FCE"
								style={{ border: '1px solid #D6D6D6', boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.1)' }}
								maxWidth={'350px'}
								maxHeight={'350px'}
							>
								<div className="exchange-rate">
									<Text
										style={{ fontWeight: 600, textAlign: 'center', marginBottom: '10px' }}
										fontFamily="sansSerif"
									>
										1 DyDAI ={this.state.rate} DAI;
									</Text>
								</div>
								<div className="balance-details">
									<span style={{ color: 'black', fontSize: '13px' }}>
										{' '}
										<b>DAI balance </b>{' '}
									</span>
									<span style={{ color: '#3F3D4B', fontSize: '12px' }}>
										<p>{this.state.userDAIBalance}</p>
									</span>

									<span style={{ color: 'black', fontSize: '13px' }}>
										{' '}
										<b>DyDAI balance </b>
									</span>
									<span style={{ color: '#3F3D4B', fontSize: '12px' }}>
										{' '}
										<p>{this.state.userDyDAIBalance}</p>
									</span>

									<span style={{ color: 'black', fontSize: '13px' }}>
										{' '}
										<b>User's locked DAI</b>
									</span>
									<span style={{ color: '#3F3D4B', fontSize: '12px' }}>
										{' '}
										<p>{this.state.daiLocked}</p>
									</span>
								</div>
							</Card>
							<WidgetBot
								style={{ marginLeft: '50px', width: '350px', height: '350px' }}
								server="699918253086212107"
								channel="699919340409192459"
								shard="https://e.widgetbot.io"
							/>
						</Flex>
						<Button style={{ marginTop: '10px', marginLeft: '2px' }} onClick={this.onWithdraw}>
							Withdraw
						</Button>
					</div>
				)}
				<div id="footer" style={{ width: '100%', marginTop: '20px' }}>
					<div id="creds">
						Created by
						<ul>
							<li>
								<a
									style={{ marginLeft: '3px', marginRight: '3px', fontWeight: '15' }}
									id="creator"
									href="https://cryptionstudios.com"
									target="_blank"
									rel="noopener noreferrer"
								>
									Cryption Studios
								</a>
							</li>
							and {' '}
							<li>
								<a
									style={{ marginLeft: '3px', marginRight: '7px', fontWeight: '15' }}
									href="https://github.com/Akkii4"
									target="_blank"
									rel="noopener noreferrer"
									id="creator"
								>
									Akshit
								</a>
							</li>
							UI by <li />
							<li>
								<a
									style={{ marginLeft: '3px', marginRight: '7px', fontWeight: '15' }}
									href="https://github.com/ananddharne"
									target="_blank"
									rel="noopener noreferrer"
									id="creator"
								>
									Anand Dharne
								</a>
							</li>
						</ul>
					</div>
				</div>
			</div>
		);
	}
}

export default App;
